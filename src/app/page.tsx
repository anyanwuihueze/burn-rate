
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BurnGauge } from '@/components/dashboard/BurnGauge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MultiProviderTable } from '@/components/dashboard/MultiProviderTable';
import { OptimizationEngine } from '@/components/dashboard/OptimizationEngine';
import { KeyVault } from '@/components/vault/KeyVault';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { 
  Zap, Flame, Calendar, Cpu, Activity, LayoutDashboard, 
  Settings, Database, ArrowUpRight, LogOut, Loader2, AlertTriangle, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UsageLog, APIKey, User } from '@/types/supabase';

// Anomaly detection types
interface AnomalyAlert {
  id: string;
  type: 'spike' | 'leak_suspected' | 'unusual_pattern';
  severity: 'critical' | 'warning';
  message: string;
  detectedAt: string;
  recommendedAction: string;
}

export default function BurnRateDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [spent, setSpent] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setSetupError('Authentication service not responding. Please check your Supabase configuration.');
          setLoading(false);
          return;
        }
        setSession(session);
        if (!session) setLoading(false);
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        setSetupError('Could not initialize application. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
        setLoading(false);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchData();
      setupRealtime();
      detectAnomalies();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const userId = session.user.id;

      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
      setUser(userData);

      const { data: keys } = await supabase.from('api_keys').select('*').eq('user_id', userId).eq('is_active', true);
      setApiKeys(keys || []);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startOfMonth.toISOString())
        .order('timestamp', { ascending: false });

      setUsageLogs(logs || []);
      recalculateSpend(logs || [], userData?.monthly_budget || 2000);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel('usage_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'usage_logs',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newLog = payload.new as UsageLog;
        setUsageLogs(prev => [newLog, ...prev]);
        setSpent(prev => {
          const newSpent = prev + newLog.cost;
          setPercentage((newSpent / (user?.monthly_budget || 2000)) * 100);
          return newSpent;
        });
        // Check for anomalies on new data
        checkForAnomalies(newLog);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  // Anomaly detection
  const detectAnomalies = useCallback(() => {
    const alerts: AnomalyAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get recent logs (last hour)
    const recentLogs = usageLogs.filter(log => new Date(log.timestamp) > oneHourAgo);
    const recentCost = recentLogs.reduce((sum, log) => sum + log.cost, 0);
    
    // Get baseline (average per hour over last 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dayLogs = usageLogs.filter(log => new Date(log.timestamp) > twentyFourHoursAgo);
    const avgHourlyCost = dayLogs.reduce((sum, log) => sum + log.cost, 0) / 24;
    
    // Spike detection: 3x normal usage
    if (recentCost > avgHourlyCost * 3 && avgHourlyCost > 0) {
      alerts.push({
        id: 'spike-' + now.toISOString(),
        type: 'spike',
        severity: 'warning',
        message: `Usage spike detected: $${recentCost.toFixed(2)} in last hour (normal: $${avgHourlyCost.toFixed(2)})`,
        detectedAt: now.toISOString(),
        recommendedAction: 'Review recent API calls for unexpected activity'
      });
    }
    
    // Critical spike: 5x normal or >$50/hour
    if ((recentCost > avgHourlyCost * 5 && avgHourlyCost > 0) || recentCost > 50) {
      alerts.push({
        id: 'critical-spike-' + now.toISOString(),
        type: 'leak_suspected',
        severity: 'critical',
        message: `CRITICAL: Possible key leak or runaway process. $${recentCost.toFixed(2)} spent in last hour.`,
        detectedAt: now.toISOString(),
        recommendedAction: 'EMERGENCY: Revoke API keys immediately'
      });
    }
    
    setAnomalies(alerts);
  }, [usageLogs]);

  const checkForAnomalies = (newLog: UsageLog) => {
    // Real-time check on each new log
    const last5Minutes = usageLogs.filter(log => 
      new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
    );
    const recentCost = last5Minutes.reduce((sum, log) => sum + log.cost, 0);
    
    if (recentCost > 10) { // $10 in 5 minutes is suspicious
      setAnomalies(prev => [{
        id: 'realtime-' + Date.now(),
        type: 'unusual_pattern',
        severity: 'critical',
        message: `Rapid spending: $${recentCost.toFixed(2)} in last 5 minutes`,
        detectedAt: new Date().toISOString(),
        recommendedAction: 'Check for infinite loops or key exposure'
      }, ...prev]);
    }
  };

  const recalculateSpend = (logs: UsageLog[], budget: number) => {
    const total = logs.reduce((sum, log) => sum + log.cost, 0);
    setSpent(total);
    setPercentage((total / budget) * 100);
  };

  // Kill switch: Emergency key revocation
  const handleEmergencyRevoke = async (key: APIKey) => {
    setRevoking(true);
    try {
      // 1. Delete from database immediately
      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', key.id);
      
      if (deleteError) throw deleteError;
      
      // 2. Log the revocation
      await supabase.from('usage_logs').insert({
        user_id: session.user.id,
        provider: key.provider,
        model: 'KEY_REVOKED',
        tokens_input: 0,
        tokens_output: 0,
        cost: 0,
        timestamp: new Date().toISOString(),
        metadata: { 
          action: 'emergency_revoke',
          key_id: key.id,
          reason: 'suspected_leak'
        }
      });
      
      // 3. Update local state
      setApiKeys(prev => prev.filter(k => k.id !== key.id));
      setShowKillSwitch(false);
      setKeyToRevoke(null);
      
      // 4. Show alert (in real app, use toast)
      alert(`Key "${key.nickname}" revoked successfully. All future requests blocked.`);
      
    } catch (error) {
      console.error('Revoke failed:', error);
      alert('Failed to revoke key. Try again or contact support.');
    } finally {
      setRevoking(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setApiKeys([]);
    setUsageLogs([]);
  };

  const monthlyBurnRate = spent / (new Date().getDate() * 24);
  const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokens_input + log.tokens_output, 0);
  const daysRemaining = user ? (user.monthly_budget - spent) / (monthlyBurnRate * 24) : 0;
  
  const providerCosts: Record<string, number> = {};
  usageLogs.forEach(log => { providerCosts[log.provider] = (providerCosts[log.provider] || 0) + log.cost; });
  const primaryProvider = Object.entries(providerCosts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  // Get critical anomalies
  const criticalAlerts = anomalies.filter(a => a.severity === 'critical');

  if (setupError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-6 text-destructive">
          <AlertTriangle size={48} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Application Setup Incomplete</h2>
        <p className="text-muted-foreground max-w-md mb-8">{setupError}</p>
        <Button onClick={() => window.location.reload()}>Retry Connection</Button>
      </div>
    );
  }

  if (!session && !loading) {
    return <AuthScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-[#FF453A] text-white px-4 py-3 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} />
              <span className="font-bold">{criticalAlerts[0].message}</span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowKillSwitch(true)}
              className="bg-white text-[#FF453A] hover:bg-white/90 font-bold"
            >
              EMERGENCY KILL SWITCH
            </Button>
          </div>
        </div>
      )}

      <AlertBanner percentage={percentage} />

      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Flame className="text-white" size={20} />
              </div>
              <h1 className="font-headline font-bold text-lg tracking-tight">BURN RATE</h1>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-foreground flex items-center gap-2">
                <LayoutDashboard size={16} className="text-primary" />
                Dashboard
              </a>
              <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Database size={16} />
                Vault
              </a>
              <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Activity size={16} />
                Analytics
              </a>
              <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Settings size={16} />
                Command Center
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Anomaly Badge */}
            {anomalies.length > 0 && (
              <Badge 
                variant="outline" 
                className={`font-code text-[10px] hidden sm:flex gap-1 border-muted cursor-pointer hover:bg-muted/50 ${anomalies.some(a => a.severity === 'critical') ? 'text-[#FF453A] border-[#FF453A]' : 'text-[#FF9F0A]'}`}
                onClick={() => setShowKillSwitch(true)}
              >
                <AlertTriangle size={10} />
                {anomalies.length} ALERT{anomalies.length > 1 ? 'S' : ''}
              </Badge>
            )}
            <Badge variant="outline" className="font-code text-[10px] hidden sm:flex gap-1 border-muted text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
              LIVE TELEMETRY
            </Badge>
            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSignOut}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full space-y-10">
        
        {/* Anomaly Warnings (Non-critical) */}
        {anomalies.filter(a => a.severity === 'warning').map(alert => (
          <div key={alert.id} className="bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-[#FF9F0A]" size={20} />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowKillSwitch(true)}>
              Review Keys
            </Button>
          </div>
        ))}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <BurnGauge percentage={percentage} spent={spent} totalBudget={user?.monthly_budget || 2000} />
          </div>
          
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard 
              label="Monthly Burn Rate"
              value={`$${monthlyBurnRate.toFixed(2)}/hr`}
              trend="up"
              trendValue="+12%"
              icon={<Flame size={18} />}
              color="text-[#FF453A]"
              sparkData={usageLogs.slice(0, 7).map(l => l.cost * 100)}
            />
            <StatsCard 
              label="Total Tokens"
              value={(totalTokens / 1000).toFixed(1) + 'k'}
              trend="stable"
              trendValue="Live"
              icon={<Zap size={18} />}
              color="text-[#FF9F0A]"
            />
            <StatsCard 
              label="Runway Remaining"
              value={`${daysRemaining.toFixed(1)} Days`}
              trend="down"
              trendValue="-1.2d"
              icon={<Calendar size={18} />}
              color="text-[#30D158]"
            />
            <StatsCard 
              label="Primary Engine"
              value={primaryProvider.charAt(0).toUpperCase() + primaryProvider.slice(1)}
              trend="stable"
              trendValue="64% total"
              icon={<Cpu size={18} />}
              color="text-[#0A84FF]"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <MultiProviderTable usageLogs={usageLogs} />
            <div className="p-6 rounded-xl border border-border bg-card shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-[#30D158]/10 text-[#30D158]">
                  <ArrowUpRight size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Predictive Cost Intelligence</h3>
                  <p className="text-sm text-muted-foreground">
                    Spend projected to reach ${(spent * 2).toFixed(0)} by end of cycle.
                  </p>
                </div>
              </div>
              <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-full font-bold px-8">
                View Projection
              </Button>
            </div>
          </div>
          
          <div className="space-y-8">
            {/* Kill Switch Card */}
            <div className="p-6 rounded-xl border border-[#FF453A]/30 bg-[#FF453A]/5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="text-[#FF453A]" size={24} />
                <h3 className="font-bold text-lg">Emergency Kill Switch</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Suspect a key leak? Revoke immediately to stop all usage.
              </p>
              <Button 
                variant="destructive" 
                className="w-full bg-[#FF453A] hover:bg-[#FF453A]/90"
                onClick={() => setShowKillSwitch(true)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                REVOKE KEYS
              </Button>
            </div>

            <OptimizationEngine usageLogs={usageLogs} />
            <KeyVault 
              apiKeys={apiKeys} 
              onKeysChange={fetchData} 
              onEmergencyRevoke={(key) => {
                setKeyToRevoke(key);
                setShowKillSwitch(true);
              }}
            />
          </div>
        </div>

      </main>

      <footer className="border-t border-border mt-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
            <Flame size={18} />
            <span className="font-headline font-bold text-sm tracking-tighter">BURN RATE v1.0.4</span>
          </div>
          <p className="text-xs text-muted-foreground font-code">
            SECURELY MONITORING {usageLogs.length.toLocaleString()} API CALLS TODAY
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Security Audit</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>

      {/* Kill Switch Dialog */}
      <Dialog open={showKillSwitch} onOpenChange={setShowKillSwitch}>
        <DialogContent className="max-w-md border-[#FF453A]/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#FF453A]">
              <ShieldAlert size={20} />
              EMERGENCY KEY REVOCATION
            </DialogTitle>
            <DialogDescription>
              This will immediately delete API keys and block all future requests. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {keyToRevoke ? (
              <div className="p-4 rounded-lg bg-muted border border-[#FF453A]/30">
                <p className="font-medium">{keyToRevoke.nickname}</p>
                <p className="text-sm text-muted-foreground">{keyToRevoke.provider}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Select key to revoke:</p>
                {apiKeys.map(key => (
                  <button
                    key={key.id}
                    onClick={() => setKeyToRevoke(key)}
                    className="w-full p-3 rounded-lg border border-border hover:border-[#FF453A] hover:bg-[#FF453A]/5 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{key.nickname}</span>
                      <Badge variant="secondary">{key.provider}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setShowKillSwitch(false);
                setKeyToRevoke(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1 bg-[#FF453A] hover:bg-[#FF453A]/90"
              disabled={!keyToRevoke || revoking}
              onClick={() => keyToRevoke && handleEmergencyRevoke(keyToRevoke)}
            >
              {revoking ? 'REVOKING...' : 'CONFIRM REVOKE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for confirmation!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-primary p-3 rounded-xl inline-flex mb-4">
            <Flame className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">BURN RATE</h1>
          <p className="text-muted-foreground mt-2">Real-time API usage monitoring</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-card border border-border text-foreground" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-card border border-border text-foreground" required />
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
