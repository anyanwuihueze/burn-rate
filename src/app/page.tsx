"use client";

import React, { useState, useEffect } from 'react';
import { BurnGauge } from '@/components/dashboard/BurnGauge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MultiProviderTable } from '@/components/dashboard/MultiProviderTable';
import { OptimizationEngine } from '@/components/dashboard/OptimizationEngine';
import { KeyVault } from '@/components/vault/KeyVault';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { 
  Zap, 
  Flame, 
  Calendar, 
  Cpu, 
  Activity, 
  LayoutDashboard, 
  Settings, 
  Database, 
  ArrowUpRight,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BurnRateDashboard() {
  const [spent, setSpent] = useState(1420);
  const [budget] = useState(2000);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    // Initial animation
    setPercentage((spent / budget) * 100);

    // Simulate real-time burn
    const interval = setInterval(() => {
      setSpent(prev => {
        const next = prev + (Math.random() * 0.05);
        setPercentage((next / budget) * 100);
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [spent, budget]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Smart Threshold Alert */}
      <AlertBanner percentage={percentage} />

      {/* Header / Navbar */}
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
            <Badge variant="outline" className="font-code text-[10px] hidden sm:flex gap-1 border-muted text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
              LIVE TELEMETRY
            </Badge>
            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle size={24} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full space-y-10">
        
        {/* Hero Section: Gauge + Top Level Stats */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <BurnGauge 
              percentage={percentage} 
              spent={spent} 
              totalBudget={budget} 
            />
          </div>
          
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard 
              label="Monthly Burn Rate"
              value={`$${(spent / 12).toFixed(2)}/hr`}
              trend="up"
              trendValue="+12%"
              icon={<Flame size={18} />}
              color="text-[#FF453A]"
            />
            <StatsCard 
              label="Spend Velocity"
              value="8.2k tokens/s"
              trend="stable"
              trendValue="Stable"
              icon={<Zap size={18} />}
              color="text-[#FF9F0A]"
            />
            <StatsCard 
              label="Runway Remaining"
              value="8.4 Days"
              trend="down"
              trendValue="-1.2d"
              icon={<Calendar size={18} />}
              color="text-[#30D158]"
            />
            <StatsCard 
              label="Primary Engine"
              value="Claude 3.5"
              trend="stable"
              trendValue="64% total"
              icon={<Cpu size={18} />}
              color="text-[#0A84FF]"
            />
          </div>
        </section>

        {/* Middle Section: Providers + Optimization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <MultiProviderTable />
            <div className="p-6 rounded-xl border border-border bg-card shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-[#30D158]/10 text-[#30D158]">
                  <ArrowUpRight size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Predictive Cost Intelligence</h3>
                  <p className="text-sm text-muted-foreground">Spend projected to reach $2,840 by end of cycle based on current velocity.</p>
                </div>
              </div>
              <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-full font-bold px-8">
                View Projection
              </Button>
            </div>
          </div>
          
          <div className="space-y-8">
            <OptimizationEngine />
            <KeyVault />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
            <Flame size={18} />
            <span className="font-headline font-bold text-sm tracking-tighter">BURN RATE v1.0.4</span>
          </div>
          <p className="text-xs text-muted-foreground font-code">
            SECURELY MONITORING 24,192 API CALLS TODAY
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Security Audit</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
