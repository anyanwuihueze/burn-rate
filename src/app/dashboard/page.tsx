"use client";
import dynamic from 'next/dynamic';

import React, { useState, useEffect } from 'react';
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
import type { APIKey, UsageLog } from '@/types/supabase';

function BurnRateDashboardInner() {
  const [userId, setUserId] = useState<string>('a8fccc8f-13c4-453c-8d10-3ecc77e9fa45');
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [spent, setSpent] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);
  const [anomalies, setAnomalies] = useState<Array<{
    id: string;
    severity: string;
    message: string;
    recommendedAction: string;
  }>>([]);
  const [showKillSwitch, setShowKillSwitch] = useState<boolean>(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  
  const supabase = createClient();
  const monthlyBudget: number = 2000;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setUserId(data.user.id);
      }
    });
  }, [supabase.auth]);

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
  }, [mounted, userId]); // Added userId dependency

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
      const totalSpent = logs?.reduce((sum: number, log: UsageLog) => sum + (log.cost || 0), 0) || 0;
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

  const detectAnomalies = (logs: UsageLog[]) => {
    const alerts: Array<{
      id: string;
      severity: string;
      message: string;
      recommendedAction: string;
    }> = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentLogs = logs.filter((log: UsageLog) => new Date(log.timestamp) > oneHourAgo);
    const dayLogs = logs.filter((log: UsageLog) => new Date(log.timestamp) > oneDayAgo);
    const weekLogs = logs.filter((log: UsageLog) => new Date(log.timestamp) > sevenDaysAgo);

    const recentCost = recentLogs.reduce((sum: number, log: UsageLog) => sum + log.cost, 0);
    const dayCost = dayLogs.reduce((sum: number, log: UsageLog) => sum + log.cost, 0);
    const weekCost = weekLogs.reduce((sum: number, log: UsageLog) => sum + log.cost, 0);
    const avgDailyCost = weekCost / 7;

    // Rule 1: hourly spike over $2
    if (recentCost > 2.00) {
      alerts.push({
        id: 'spike-hour-' + now.getTime(),
        severity: 'critical',
        message: `🚨 Hourly spike: $${recentCost.toFixed(2)} in last hour`,
        recommendedAction: 'Review usage or revoke keys'
      });
    }

    // Rule 2: today is 3x higher than daily average
    if (avgDailyCost > 0 && dayCost > avgDailyCost * 3) {
      alerts.push({
        id: 'spike-day-' + now.getTime(),
        severity: 'critical',
        message: `🚨 Unusual day: $${dayCost.toFixed(2)} today vs $${avgDailyCost.toFixed(2)} daily avg`,
        recommendedAction: 'Possible unauthorized usage — check your keys'
      });
    }

    // Rule 3: single provider burning over 80% of total
    const byCost: Record<string, number> = {};
    dayLogs.forEach((log: UsageLog) => { 
      byCost[log.provider] = (byCost[log.provider] || 0) + log.cost; 
    });
    Object.entries(byCost).forEach(([provider, cost]: [string, number]) => {
      if (dayCost > 0 && (cost / dayCost) > 0.8 && dayCost > 1) {
        alerts.push({
          id: 'provider-dom-' + provider,
          severity: 'warning',
          message: `⚠️ ${provider} is ${Math.round((cost/dayCost)*100)}% of today's spend ($${cost.toFixed(2)})`,
          recommendedAction: 'Check if this provider usage is expected'
        });
      }
    });

    // Rule 4: on track to exceed monthly budget
    const daysInMonth = 30;
    const projectedMonthly = (dayCost / 1) * daysInMonth;
    if (projectedMonthly > monthlyBudget * 0.9 && dayCost > 0.5) {
      alerts.push({
        id: 'budget-projection-' + now.getTime(),
        severity: 'warning',
        message: `⚠️ On track to spend $${projectedMonthly.toFixed(0)} this month (budget: $${monthlyBudget})`,
        recommendedAction: 'Consider switching to cheaper models'
      });
    }

    setAnomalies(alerts);
  };

  const handleEmergencyRevoke = async (key: APIKey | null) => {
    if (!key) return;
    setRevoking(true);
    try {
      await supabase.from('api_keys').update({ is_active: false }).eq('id', key.id);
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
  const totalTokens = usageLogs.reduce((sum: number, log: UsageLog) => sum + (log.tokens_input || 0) + (log.tokens_output || 0), 0);
  const daysRemaining = (monthlyBudget - spent) / (monthlyBurnRate * 24) || 30;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
            <Badge variant="secondary" className="text-[10px]">TEST MODE</Badge>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>🔄 Refresh</Button>
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
              trend="stable"
            />
            <StatsCard 
              label="Total Tokens"
              value={totalTokens.toLocaleString()}
              icon={<Cpu size={18} />}
              color="text-blue-500"
              trend="stable"
            />
            <StatsCard 
              label="Days Remaining"
              value={Math.floor(daysRemaining).toString()}
              icon={<Calendar size={18} />}
              color="text-green-500"
              trend="stable"
            />
            <StatsCard 
              label="Active Keys"
              value={apiKeys.length.toString()}
              icon={<Zap size={18} />}
              color="text-purple-500"
              trend="stable"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeyVault 
            apiKeys={apiKeys} 
            onKeysChange={fetchData}
            userId={userId}
            onEmergencyRevoke={(key: APIKey) => {
              setKeyToRevoke(key);
              setShowKillSwitch(true);
            }}
          />
          <OptimizationEngine usageLogs={usageLogs} />
        </section>

        {/* SDK Required Cards */}
        {apiKeys.filter((k: APIKey) => ['google','groq','nvidia','deepseek'].includes(k.provider)).length > 0 && (
          <section className='space-y-3 mt-2'>
            <p className='text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1'>SDK-Tracked Providers</p>
            {apiKeys
              .filter((k: APIKey) => ['google','groq','nvidia','deepseek'].includes(k.provider))
              .filter((k: APIKey, i: number, arr: APIKey[]) => arr.findIndex((x: APIKey) => x.provider === k.provider) === i)
              .map((k: APIKey) => (
                <SDKRequiredCard
                  key={k.id}
                  provider={k.provider}
                  supabaseUrl={supabaseUrl}
                  supabaseAnonKey={supabaseAnonKey}
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
                <div>Key: {keyToRevoke.encrypted_key?.slice(0, 10)}...</div>
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

const BurnRateDashboard = dynamic(() => Promise.resolve(BurnRateDashboardInner), { ssr: false });
export default BurnRateDashboard;