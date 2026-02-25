"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BurnGauge } from '@/components/dashboard/BurnGauge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MultiProviderTable } from '@/components/dashboard/MultiProviderTable';
import { OptimizationEngine } from '@/components/dashboard/OptimizationEngine';
import { KeyVault } from '@/components/vault/KeyVault';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { 
  Zap, Flame, Calendar, Cpu, Activity, LayoutDashboard, 
  Settings, Database, ArrowUpRight, LogOut, Loader2, AlertTriangle, ShieldAlert,
  Terminal, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UsageLog, APIKey, User } from '@/types/supabase';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BurnRateDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [spent, setSpent] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    const checkConfig = async () => {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!hasUrl || !hasKey) {
        setSetupError('Missing Supabase credentials');
        setLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (err: any) {
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkConfig();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const userId = session.user.id;

      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
      setUser(userData);

      const { data: keys } = await supabase.from('api_keys').select('*').eq('user_id', userId).eq('is_active', true);
      setApiKeys(keys || []);

      const { data: logs } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      setUsageLogs(logs || []);
      const total = (logs || []).reduce((sum, log) => sum + log.cost, 0);
      setSpent(total);
      setPercentage((total / (userData?.monthly_budget || 2000)) * 100);
    } catch (error) {
      console.error('Data fetch error:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm text-muted-foreground">Initializing spend intelligence...</p>
        </div>
      </div>
    );
  }

  // If environment variables are missing, show a helpful setup screen
  if (setupError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto text-primary mb-2">
            <Flame size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">BURN RATE</h1>
            <p className="text-muted-foreground"> Spend intelligence for the LLM era.</p>
          </div>

          <Alert variant="destructive" className="text-left border-primary/20 bg-primary/5">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Environment Variables Required</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>Please add your Supabase credentials to your <code>.env</code> file:</p>
              <ul className="list-disc list-inside font-mono text-xs opacity-80">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="pt-4 text-xs text-muted-foreground">
            Looking for port 3000? Make sure you are viewing the preview URL correctly.
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const monthlyBurnRate = spent / (Math.max(1, new Date().getDate()) * 24);
  const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokens_input + log.tokens_output, 0);
  const daysRemaining = user ? (user.monthly_budget - spent) / Math.max(0.01, monthlyBurnRate * 24) : 0;
  
  const providerCosts: Record<string, number> = {};
  usageLogs.forEach(log => { providerCosts[log.provider] = (providerCosts[log.provider] || 0) + log.cost; });
  const primaryProvider = Object.entries(providerCosts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-code text-[10px] hidden sm:flex gap-1 border-muted text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
              LIVE TELEMETRY
            </Badge>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSignOut}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full space-y-10">
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
          </div>
          
          <div className="space-y-8">
            <OptimizationEngine usageLogs={usageLogs} />
            <KeyVault apiKeys={apiKeys} onKeysChange={fetchData} />
          </div>
        </div>
      </main>
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
          <p className="text-muted-foreground mt-2">Real-time spend intelligence</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-card border border-border text-foreground focus:ring-2 focus:ring-primary outline-none" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-card border border-border text-foreground focus:ring-2 focus:ring-primary outline-none" required />
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
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
