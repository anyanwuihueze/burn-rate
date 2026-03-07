"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, ArrowRightLeft, TrendingDown, Check } from 'lucide-react';

interface ModelAlternative {
  model: string;
  provider: string;
  estimatedCost: number;
  savings: number;
  savingsPercent: number;
  quality: string;
}

interface CurrentUsage {
  model: string;
  provider: string;
  cost: number;
  tokens: number;
}

interface ModelComparisonCardProps {
  userId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
  },
  header: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '20px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'DM Sans', sans-serif",
  },
  content: {
    padding: '20px',
  },
  currentModel: {
    background: 'rgba(255, 159, 10, 0.1)',
    border: '1px solid rgba(255, 159, 10, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  currentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  currentLabel: {
    fontSize: '12px',
    color: '#FF9F0A',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  currentCost: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f0f0f0',
    fontFamily: "'DM Mono', monospace",
  },
  currentMeta: {
    fontSize: '12px',
    color: '#666',
  },
  alternativeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    background: 'rgba(48, 209, 88, 0.05)',
    border: '1px solid rgba(48, 209, 88, 0.2)',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  altModel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  altIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(48, 209, 88, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f0f0f0',
  },
  altProvider: {
    fontSize: '12px',
    color: '#666',
  },
  savingsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(48, 209, 88, 0.2)',
    color: '#30D158',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: '14px',
  },
  savingsSummary: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(10, 132, 255, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#666',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0A84FF',
    fontFamily: "'DM Mono', monospace",
  },
};

const MODEL_PRICING: Record<string, { input: number; output: number; quality: string }> = {
  'llama-3.3-70b': { input: 0.00059, output: 0.00079, quality: 'high' },
  'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008, quality: 'fast' },
  'gemini-2.0-flash': { input: 0.0001, output: 0.0004, quality: 'fast' },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003, quality: 'fast' },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006, quality: 'medium' },
  'claude-3-haiku': { input: 0.00025, output: 0.00125, quality: 'fast' },
};

export function ModelComparisonCard({ userId, supabaseUrl, supabaseAnonKey }: ModelComparisonCardProps) {
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage | null>(null);
  const [alternatives, setAlternatives] = useState<ModelAlternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [potentialSavings, setPotentialSavings] = useState(0);

  useEffect(() => {
    fetchCurrentUsage();
  }, [userId]);

  const fetchCurrentUsage = async () => {
    if (!userId) return;
    
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/usage_logs?select=model,provider,cost,tokens_input,tokens_output&user_id=eq.${userId}&timestamp=gte.${oneDayAgo}&order=cost.desc&limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        const usage = data[0];
        const tokens = (usage.tokens_input || 0) + (usage.tokens_output || 0);
        
        setCurrentUsage({
          model: usage.model,
          provider: usage.provider,
          cost: usage.cost || 0,
          tokens,
        });

        const currentModel = usage.model;
        const currentCost = usage.cost || 0;
        const inputTokens = usage.tokens_input || 0;
        const outputTokens = usage.tokens_output || 0;
        
        const alts = Object.entries(MODEL_PRICING)
          .filter(([model]) => model !== currentModel)
          .map(([model, pricing]) => {
            const estimatedCost = ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1000;
            const savings = currentCost - estimatedCost;
            
            return {
              model,
              provider: getProviderForModel(model),
              estimatedCost,
              savings,
              savingsPercent: currentCost > 0 ? (savings / currentCost) * 100 : 0,
              quality: pricing.quality,
            };
          })
          .filter(alt => alt.savings > 0)
          .sort((a, b) => b.savings - a.savings)
          .slice(0, 3);

        setAlternatives(alts);
        
        const dailySavings = alts[0]?.savings || 0;
        setPotentialSavings(dailySavings * 30);
      }
    } catch (error) {
      console.error('[ModelComparison] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderForModel = (model: string): string => {
    if (model.includes('llama') || model.includes('mixtral') || model.includes('gemma')) return 'groq';
    if (model.includes('gemini')) return 'google';
    if (model.includes('gpt')) return 'openai';
    if (model.includes('claude')) return 'anthropic';
    return 'unknown';
  };

  const formatModelName = (model: string) => {
    return model
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <CardTitle style={styles.title}>
            <ArrowRightLeft size={18} color="#30D158" />
            Model Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent style={styles.content}>
          <div style={styles.emptyState}>Analyzing usage...</div>
        </CardContent>
      </Card>
    );
  }

  if (!currentUsage || alternatives.length === 0) {
    return (
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <CardTitle style={styles.title}>
            <ArrowRightLeft size={18} color="#30D158" />
            Model Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent style={styles.content}>
          <div style={styles.emptyState}>
            <Cpu size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>Not enough data for comparison.</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
              Use more AI calls to see savings opportunities.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <CardHeader style={styles.header}>
        <CardTitle style={styles.title}>
          <ArrowRightLeft size={18} color="#30D158" />
          Model Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        <div style={styles.currentModel}>
          <div style={styles.currentHeader}>
            <span style={styles.currentLabel}>Current Model</span>
            <Badge variant="outline" style={{ borderColor: '#FF9F0A', color: '#FF9F0A' }}>
              {currentUsage.provider}
            </Badge>
          </div>
          <div style={styles.currentCost}>
            {formatModelName(currentUsage.model)}
          </div>
          <div style={styles.currentMeta}>
            ${currentUsage.cost.toFixed(4)} per call · {currentUsage.tokens.toLocaleString()} tokens
          </div>
        </div>

        <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Cheaper Alternatives
        </div>

        {alternatives.map((alt) => (
          <div key={alt.model} style={styles.alternativeRow}>
            <div style={styles.altModel}>
              <div style={styles.altIcon}>
                <TrendingDown size={16} color="#30D158" />
              </div>
              <div>
                <div style={styles.altName}>{formatModelName(alt.model)}</div>
                <div style={styles.altProvider}>{alt.provider} · {alt.quality}</div>
              </div>
            </div>
            <div style={styles.savingsBadge}>
              <Check size={12} />
              Save {alt.savingsPercent.toFixed(0)}%
            </div>
          </div>
        ))}

        {potentialSavings > 0 && (
          <div style={styles.savingsSummary}>
            <span style={styles.summaryLabel}>Potential Monthly Savings</span>
            <span style={styles.summaryValue}>${potentialSavings.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}