"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, TrendingDown, Layers, Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsageLog } from '@/types/supabase';

interface OptimizationEngineProps {
  usageLogs: UsageLog[];
  monthlyBudget?: number;
}

interface Recommendation {
  id: string;
  type: 'model_downgrade' | 'prompt_caching' | 'provider_switch' | 'budget_alert';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: number;
  action: string;
}

export const OptimizationEngine: React.FC<OptimizationEngineProps> = ({ 
  usageLogs, 
  monthlyBudget = 2000 
}) => {
  const [loading, setLoading] = useState(false);

  // Real analysis based on actual usage data
  const recommendations = useMemo((): Recommendation[] => {
    if (!usageLogs || usageLogs.length === 0) return [];

    const recs: Recommendation[] = [];
    
    // 1. Analyze provider costs
    const providerCosts: Record<string, number> = {};
    const providerTokens: Record<string, number> = {};
    
    usageLogs.forEach(log => {
      providerCosts[log.provider] = (providerCosts[log.provider] || 0) + log.cost;
      providerTokens[log.provider] = (providerTokens[log.provider] || 0) + log.tokens_input + log.tokens_output;
    });

    const totalCost = Object.values(providerCosts).reduce((a, b) => a + b, 0);
    const totalTokens = Object.values(providerTokens).reduce((a, b) => a + b, 0);

    // High concentration alert
    const mostExpensive = Object.entries(providerCosts).sort((a, b) => b[1] - a[1])[0];
    if (mostExpensive && mostExpensive[1] > totalCost * 0.7) {
      recs.push({
        id: 'provider-concentration',
        type: 'provider_switch',
        severity: 'high',
        title: 'Over-reliance on ' + mostExpensive[0],
        description: `${mostExpensive[0]} consumes ${((mostExpensive[1] / totalCost) * 100).toFixed(0)}% of your budget. Diversifying providers could reduce costs by 20-30%.`,
        potentialSavings: mostExpensive[1] * 0.25,
        action: 'Compare providers'
      });
    }

    // 2. Model optimization
    const modelUsage: Record<string, { cost: number; tokens: number }> = {};
    usageLogs.forEach(log => {
      if (!modelUsage[log.model]) {
        modelUsage[log.model] = { cost: 0, tokens: 0 };
      }
      modelUsage[log.model].cost += log.cost;
      modelUsage[log.model].tokens += log.tokens_input + log.tokens_output;
    });

    // Check for expensive models on simple tasks
    const expensiveModels = ['gpt-4', 'claude-3-opus', 'gemini-ultra'];
    const cheapAlternatives: Record<string, string> = {
      'gpt-4': 'gpt-3.5-turbo',
      'claude-3-opus': 'claude-3-sonnet',
      'gemini-ultra': 'gemini-pro'
    };

    Object.entries(modelUsage).forEach(([model, data]) => {
      if (expensiveModels.some(em => model.includes(em)) && data.tokens > 100000) {
        const cheaper = cheapAlternatives[Object.keys(cheapAlternatives).find(k => model.includes(k)) || ''];
        if (cheaper) {
          recs.push({
            id: `model-downgrade-${model}`,
            type: 'model_downgrade',
            severity: 'medium',
            title: `Optimize ${model} usage`,
            description: `You've used ${model} for ${data.tokens.toLocaleString()} tokens ($${data.cost.toFixed(2)}). Switching to ${cheaper} for non-critical tasks could save 60%.`,
            potentialSavings: data.cost * 0.6,
            action: `Switch to ${cheaper}`
          });
        }
      }
    });

    // 3. High volume = caching opportunity
    if (totalTokens > 500000) {
      recs.push({
        id: 'prompt-caching',
        type: 'prompt_caching',
        severity: 'medium',
        title: 'Implement prompt caching',
        description: `High token volume (${totalTokens.toLocaleString()}) detected. Caching repeated prompts could reduce costs by 15-25%.`,
        potentialSavings: totalCost * 0.2,
        action: 'View caching guide'
      });
    }

    // 4. Budget burn rate alert
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const projectedSpend = (totalCost / dayOfMonth) * daysInMonth;
    
    if (projectedSpend > monthlyBudget * 0.9) {
      recs.push({
        id: 'budget-alert',
        type: 'budget_alert',
        severity: 'high',
        title: 'Budget burn rate critical',
        description: `At current rate, you'll spend $${projectedSpend.toFixed(0)} this month (budget: $${monthlyBudget}).`,
        potentialSavings: projectedSpend - monthlyBudget,
        action: 'Reduce usage now'
      });
    }

    return recs.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [usageLogs, monthlyBudget]);

  const totalSavings = recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);

  const getIcon = (type: string) => {
    switch (type) {
      case 'model_downgrade': return <Layers className="text-blue-500" size={18} />;
      case 'prompt_caching': return <Zap className="text-yellow-500" size={18} />;
      case 'provider_switch': return <TrendingDown className="text-green-500" size={18} />;
      case 'budget_alert': return <AlertTriangle className="text-red-500" size={18} />;
      default: return <Sparkles className="text-muted-foreground" size={18} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-border bg-card shadow-xl overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles size={80} />
      </div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              Optimization Engine
            </CardTitle>
            <CardDescription>
              {recommendations.length > 0 
                ? `Found ${recommendations.length} ways to save $${totalSavings.toFixed(0)}/month`
                : 'Analyzing your usage patterns...'}
            </CardDescription>
          </div>
          {totalSavings > 0 && (
            <Badge className="bg-green-500/10 text-green-500 border-none">
              Save ${totalSavings.toFixed(0)}/mo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-lg bg-muted/10">
            <Layers className="text-muted-foreground mb-3" size={32} />
            <p className="text-sm text-muted-foreground max-w-xs">
              {usageLogs.length === 0 
                ? "Add API keys and generate usage to get personalized recommendations."
                : "Great job! No major optimizations found. Your usage is efficient."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className={`group p-4 rounded-lg border transition-all ${getSeverityColor(rec.severity)}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-background border border-border">
                    {getIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{rec.title}</span>
                      <Badge variant="secondary" className="bg-white/20 text-inherit border-none font-code text-[10px]">
                        Save ${rec.potentialSavings.toFixed(0)}/mo
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90 leading-relaxed mb-3">
                      {rec.description}
                    </p>
                    <Button variant="link" className="p-0 h-auto text-xs text-inherit group-hover:translate-x-1 transition-transform">
                      {rec.action} <ArrowRight size={12} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
