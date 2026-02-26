"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BurnGauge } from '@/components/dashboard/BurnGauge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MultiProviderTable } from '@/components/dashboard/MultiProviderTable';
import { OptimizationEngine } from '@/components/dashboard/OptimizationEngine';
import { KeyVault } from '@/components/vault/KeyVault';
import { SDKRequiredCard } from '@/components/dashboard/SDKRequiredCard';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { 
  Zap, Flame, Calendar, Cpu, ShieldAlert, AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const [userId, setUserId] = useState<string | null>(null);

export default function BurnRateDashboard() {
  const [usageLogs, setUsageLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spent, setSpent] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [anomalies, setAnomalies] = useState([]);
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const supabase = createClient();
  const monthlyBudget = 2000;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // FORCE MOUNT
  useEffect(() => {
    setMounted(true);
  }, []);

  // FETCH DATA IMMEDIATELY WHEN MOUNTED
  useEffect(() => {
    if (!mounted) return;
    
    console.log('🔥 FETCHING DATA...');
    fetchData();
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [mounted]);

  const fetchData = async () => {
    try {
      console.log("📡 Calling Supabase...");
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: logs, error: logsError } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("timestamp", startOfMonth.toISOString())
        .order("timestamp", { ascending: false });

      if (logsError) {
        console.error("Logs error:", logsError);
      } else {
        console.log("✅ Logs fetched:", logs?.length || 0);
      }

      setUsageLogs(logs || []);
      const totalSpent = logs?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;
      setSpent(totalSpent);
      setPercentage(Math.min((totalSpent / monthlyBudget) * 100, 100));

      const { data: keys, error: keysError } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);
      
      if (keysError) {
        console.error("Keys error:", keysError);
      } else {
        console.log("✅ Keys fetched:", keys?.length || 0);
        console.log("📦 Keys:", keys);
      }
      
      setApiKeys(keys || []);
      detectAnomalies(logs || []);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectAnomalies = (logs) => {
    const alerts = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentLogs = logs.filter(log => new Date(log.timestamp) > oneHourAgo);
    const recentCost = recentLogs.reduce((sum, log) => sum + log.cost, 0);
    
    if (recentCost > 2.00) {
      alerts.push({
        id: 'spike-' + now.getTime(),
        severity: 'critical',
        message: `Usage spike: $${recentCost.toFixed(2)} in last hour`,
        recommendedAction: 'Review usage or revoke keys'
      });
    }
    setAnomalies(alerts);
  };

  const handleEmergencyRevoke = async (key) => {
    setRevoking(true);
    try {
      await supabase.from('api_keys').delete().eq('id', key.id);
      await fetchData();
      setShowKillSwitch(false);
      setKeyToRevoke(null);
    } catch (error) {
      console.error('Revoke failed:', error);
    } finally {
      setRevoking(false);
    }
  };

  // FORCE RENDER AFTER 3 SECONDS EVEN IF LOADING
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('⏱️ FORCE RENDER - timeout reached');
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-muted-foreground">Mounting...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm text-muted-foreground">Loading spend data...</p>
        <Button variant="outline" size="sm" onClick={() => { setLoading(false); fetchData(); }}>
          <RefreshCw size={14} className="mr-2" />
          Force Load
        </Button>
      </div>
    );
  }

  const monthlyBurnRate = spent / (new Date().getDate() * 24) || 0;
  const totalTokens = usageLogs.reduce((sum, log) => sum + (log.tokens_input || 0) + (log.tokens_output || 0), 0);
  const daysRemaining = (monthlyBudget - spent) / (monthlyBurnRate * 24) || 30;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {anomalies.map(alert => (
        <div key={alert.id} className="bg-[#FF453A] text-white px-4 py-3 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} />
              <span className="font-bold">{alert.message}</span>
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
      ))}

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
            <Badge variant="secondary" className="text-[10px]">TEST MODE</Badge><Button variant="outline" size="sm" onClick={() => window.location.reload()}>🔄 Refresh</Button>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full space-y-10">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <BurnGauge percentage={percentage} spent={spent} totalBudget={monthlyBudget} />
          </div>
          
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard 
              label="Monthly Burn Rate"
              value={`$${monthlyBurnRate.toFixed(2)}/hr`}
              icon={<Flame size={18} />}
              color="text-orange-500"
            />
            <StatsCard 
              label="Total Tokens"
              value={totalTokens.toLocaleString()}
              icon={<Cpu size={18} />}
              color="text-blue-500"
            />
            <StatsCard 
              label="Days Remaining"
              value={Math.floor(daysRemaining)}
              icon={<Calendar size={18} />}
              color="text-green-500"
            />
            <StatsCard 
              label="Active Keys"
              value={apiKeys.length}
              icon={<Zap size={18} />}
              color="text-purple-500"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeyVault 
            apiKeys={apiKeys} 
            onKeysChange={fetchData}
            userId={userId ?? ""}
            onEmergencyRevoke={(key) => {
              setKeyToRevoke(key);
              setShowKillSwitch(true);
            }}
          />
          <OptimizationEngine usageLogs={usageLogs} />
        </section>

        {/* SDK Required Cards */}
        {apiKeys.filter(k => ['google','groq','nvidia','deepseek'].includes(k.provider)).length > 0 && (
          <section className='space-y-3 mt-2'>
            <p className='text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1'>SDK-Tracked Providers</p>
            {apiKeys
              .filter(k => ['google','groq','nvidia','deepseek'].includes(k.provider))
              .filter((k, i, arr) => arr.findIndex(x => x.provider === k.provider) === i)
              .map(k => (
                <SDKRequiredCard
                  key={k.id}
                  provider={k.provider}
                  supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
                  supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                />
              ))}
          </section>
        )}
        <section>
          <MultiProviderTable usageLogs={usageLogs} />
        </section>
      </main>

      <Dialog open={showKillSwitch} onOpenChange={setShowKillSwitch}>
        <DialogContent className="border-[#FF453A]/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#FF453A]">
              <AlertTriangle size={20} />
              EMERGENCY KEY REVOCATION
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the API key. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {keyToRevoke && (
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                <div>Provider: {keyToRevoke.provider}</div>
                <div>Key: {keyToRevoke.key_preview}</div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowKillSwitch(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleEmergencyRevoke(keyToRevoke)}
                disabled={revoking}
                className="flex-1 bg-[#FF453A] hover:bg-[#FF453A]/90"
              >
                {revoking ? 'Revoking...' : 'REVOKE KEY'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// TEMPORARY TEST BUTTON
function TestKeyAdd() {
  const supabase = createClient();
  const addTestKey = async () => {
    const { error } = await supabase.rpc('add_api_key', {
      p_user_id: userId,
      p_provider: "google",
      p_encrypted_key: "dGVzdA==",
      p_nickname: "Test Key"
    });
    if (error) {
      console.error("TEST FAILED:", error);
      alert("Error: " + error.message);
    } else {
      console.log("TEST SUCCESS");
      alert("Key added! Refresh page.");
    }
  };
  return <button onClick={addTestKey} style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'red',color:'white',padding:10}}>TEST ADD KEY</button>;
}
