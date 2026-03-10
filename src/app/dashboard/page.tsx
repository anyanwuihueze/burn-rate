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
import { FeatureCostBreakdown } from '@/components/dashboard/FeatureCostBreakdown';
import { ModelComparisonCard } from '@/components/dashboard/ModelComparisonCard';
import { DailySpendChart } from '@/components/dashboard/DailySpendChart';
import { 
  Zap, Flame, Calendar, Cpu, ShieldAlert, AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { APIKey, UsageLog } from '@/types/supabase';

// Inline styles object
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#080808',
    color: '#f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', sans-serif",
  },
  anomalyBanner: {
    background: '#FF3B30',
    color: 'white',
    padding: '12px 16px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  anomalyInner: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anomalyContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  anomalyText: {
    fontWeight: 'bold',
  },
  killSwitchBtn: {
    background: 'white',
    color: '#FF3B30',
    fontWeight: 'bold',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  header: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(8,8,8,0.8)',
    backdropFilter: 'blur(20px)',
    position: 'sticky',
    top: 0,
    zIndex: 40,
    padding: '0 16px',
  },
  headerInner: {
    maxWidth: '1280px',
    margin: '0 auto',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    background: '#0A84FF',
    padding: '6px',
    borderRadius: '8px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    fontFamily: "'Bebas Neue', sans-serif",
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  badge: {
    fontSize: '10px',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.1em',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    background: '#30D158',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  testBadge: {
    fontSize: '10px',
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
  },
  refreshBtn: {
    padding: '6px 12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#f0f0f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  ghostBtn: {
    padding: '6px',
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px 16px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  heroSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '40px',
    alignItems: 'center',
  },
  gaugeCol: {
    gridColumn: 'span 5',
    display: 'flex',
    justifyContent: 'center',
  },
  statsCol: {
    gridColumn: 'span 7',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  gridSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  sdkSection: {
    marginTop: '8px',
  },
  sdkTitle: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
    marginBottom: '12px',
    paddingLeft: '4px',
  },
  tableSection: {
    marginTop: '8px',
  },
  loadingContainer: {
    minHeight: '100vh',
    background: '#080808',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  loadingText: {
    color: '#666',
    fontSize: '14px',
  },
  dialogContent: {
    border: '1px solid rgba(255,59,48,0.5)',
    background: '#0f0f0f',
  },
  dialogTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#FF3B30',
  },
  keyPreview: {
    background: 'rgba(255,255,255,0.05)',
    padding: '12px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  dialogActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#f0f0f0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  revokeBtn: {
    flex: 1,
    padding: '10px',
    background: '#FF3B30',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

function BurnRateDashboardInner() {
  const [userId, setUserId] = useState<string>('');
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
      if (!data.user) {
        window.location.href = '/auth/login';
        return;
      }
      setUserId(data.user.id);
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    console.log('🔥 FETCHING DATA...');
    fetchData();
    
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [mounted, userId]);

  const fetchData = async () => {
    if (!userId) return;
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

    if (recentCost > 2.00) {
      alerts.push({
        id: 'spike-hour-' + now.getTime(),
        severity: 'critical',
        message: `🚨 Hourly spike: $${recentCost.toFixed(2)} in last hour`,
        recommendedAction: 'Review usage or revoke keys'
      });
    }

    if (avgDailyCost > 0 && dayCost > avgDailyCost * 3) {
      alerts.push({
        id: 'spike-day-' + now.getTime(),
        severity: 'critical',
        message: `🚨 Unusual day: $${dayCost.toFixed(2)} today vs $${avgDailyCost.toFixed(2)} daily avg`,
        recommendedAction: 'Possible unauthorized usage — check your keys'
      });
    }

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('⏱️ FORCE RENDER - timeout reached');
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!mounted || !userId) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0A84FF' }} />
        <span style={styles.loadingText}>Mounting...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0A84FF' }} />
        <p style={styles.loadingText}>Loading spend data...</p>
        <button 
          style={styles.refreshBtn}
          onClick={() => { setLoading(false); fetchData(); }}
        >
          <RefreshCw size={14} style={{ marginRight: '8px' }} />
          Force Load
        </button>
      </div>
    );
  }

  const monthlyBurnRate = spent / (new Date().getDate() * 24) || 0;
  const totalTokens = usageLogs.reduce((sum: number, log: UsageLog) => sum + (log.tokens_input || 0) + (log.tokens_output || 0), 0);
  const daysRemaining = (monthlyBudget - spent) / (monthlyBurnRate * 24) || 30;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <div style={styles.container}>
      {anomalies.map(alert => (
        <div key={alert.id} style={styles.anomalyBanner}>
          <div style={styles.anomalyInner}>
            <div style={styles.anomalyContent}>
              <ShieldAlert size={20} />
              <span style={styles.anomalyText}>{alert.message}</span>
            </div>
            <button 
              style={styles.killSwitchBtn}
              onClick={() => setShowKillSwitch(true)}
            >
              EMERGENCY KILL SWITCH
            </button>
          </div>
        </div>
      ))}

      <AlertBanner percentage={percentage} />

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <Flame color="white" size={20} />
              </div>
              <h1 style={styles.logoText}>BURN RATE</h1>
            </div>
          </div>
          <div style={styles.headerActions}>
            <span style={styles.badge}>
              <span style={styles.liveDot}></span>
              LIVE TELEMETRY
            </span>
            
            <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
              🔄 Refresh
            </button>
            <button style={styles.ghostBtn} onClick={fetchData}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.heroSection}>
          <div style={styles.gaugeCol}>
            <BurnGauge percentage={percentage} spent={spent} totalBudget={monthlyBudget} />
          </div>
          
          <div style={styles.statsCol}>
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

        <section style={styles.gridSection}>
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

        {apiKeys.filter((k: APIKey) => ['google','groq','nvidia','deepseek'].includes(k.provider)).length > 0 && (
          <section style={styles.sdkSection}>
            <p style={styles.sdkTitle}>SDK-Tracked Providers</p>
            {apiKeys
              .filter((k: APIKey) => ['google','groq','nvidia','deepseek'].includes(k.provider))
              .filter((k: APIKey, i: number, arr: APIKey[]) => arr.findIndex((x: APIKey) => x.provider === k.provider) === i)
              .map((k: APIKey) => (
                <SDKRequiredCard
                  key={k.id}
                  provider={k.provider}
                  supabaseUrl={supabaseUrl}
                  supabaseAnonKey={supabaseAnonKey}
                  userId={userId}
                />
              ))}
          </section>
        )}
        
        {/*<ApiKeySection userId={userId} />*/}
        <section style={styles.tableSection}>
          <MultiProviderTable usageLogs={usageLogs} />
        </section>
      </main>

      <Dialog open={showKillSwitch} onOpenChange={setShowKillSwitch}>
        <DialogContent style={styles.dialogContent}>
          <DialogHeader>
            <DialogTitle style={styles.dialogTitle}>
              <AlertTriangle size={20} />
              EMERGENCY KEY REVOCATION
            </DialogTitle>
            <DialogDescription style={{ color: '#666' }}>
              This will permanently delete the API key. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {keyToRevoke && (
              <div style={styles.keyPreview}>
                <div>Provider: {keyToRevoke.provider}</div>
                <div>Key: {keyToRevoke.encrypted_key?.slice(0, 10)}...</div>
              </div>
            )}
            <div style={styles.dialogActions}>
              <button 
                style={styles.cancelBtn}
                onClick={() => setShowKillSwitch(false)}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.revokeBtn,
                  opacity: revoking ? 0.5 : 1,
                  cursor: revoking ? 'not-allowed' : 'pointer',
                }}
                onClick={() => handleEmergencyRevoke(keyToRevoke)}
                disabled={revoking}
              >
                {revoking ? 'Revoking...' : 'REVOKE KEY'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const BurnRateDashboard = dynamic(() => Promise.resolve(BurnRateDashboardInner), { ssr: false });
export default BurnRateDashboard;