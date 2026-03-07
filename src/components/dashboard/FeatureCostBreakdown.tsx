"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, DollarSign, TrendingUp } from 'lucide-react';

interface FeatureCost {
  feature: string;
  cost: number;
  percentage: number;
}

interface FeatureCostBreakdownProps {
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
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  featureName: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  featureIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(10, 132, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: '14px',
    color: '#f0f0f0',
    fontWeight: 500,
  },
  featureMeta: {
    fontSize: '12px',
    color: '#666',
    marginTop: '2px',
  },
  costSection: {
    textAlign: 'right',
  },
  costAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f0f0f0',
    fontFamily: "'DM Mono', monospace",
  },
  costBar: {
    width: '100px',
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    marginTop: '6px',
    overflow: 'hidden',
  },
  costFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: '14px',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0 0 0',
    marginTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  totalLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f0f0f0',
  },
  totalAmount: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0A84FF',
    fontFamily: "'DM Mono', monospace",
  },
};

export function FeatureCostBreakdown({ userId, supabaseUrl, supabaseAnonKey }: FeatureCostBreakdownProps) {
  const [features, setFeatures] = useState<FeatureCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchFeatureCosts();
  }, [userId]);

  const fetchFeatureCosts = async () => {
    if (!userId) return;
    
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/usage_logs?select=feature,cost&user_id=eq.${userId}&timestamp=gte.${startOfMonth.toISOString()}`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      const breakdown: Record<string, number> = {};
      let totalCost = 0;
      
      for (const entry of data) {
        const feature = entry.feature || 'untagged';
        const cost = entry.cost || 0;
        breakdown[feature] = (breakdown[feature] || 0) + cost;
        totalCost += cost;
      }
      
      const featureArray = Object.entries(breakdown)
        .map(([feature, cost]) => ({
          feature,
          cost,
          percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);

      setFeatures(featureArray);
      setTotal(totalCost);
    } catch (error) {
      console.error('[FeatureCost] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureColor = (feature: string) => {
    const colors: Record<string, string> = {
      'visa-chat': '#0A84FF',
      'interview-prep': '#30D158',
      'document-check': '#FF9F0A',
      'eligibility': '#BF5AF2',
      'rejection-reversal': '#FF453A',
    };
    return colors[feature] || '#8E8E93';
  };

  const formatFeatureName = (feature: string) => {
    return feature
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <CardTitle style={styles.title}>
            <Layers size={18} color="#0A84FF" />
            Cost by Feature
          </CardTitle>
        </CardHeader>
        <CardContent style={styles.content}>
          <div style={styles.emptyState}>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (features.length === 0) {
    return (
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <CardTitle style={styles.title}>
            <Layers size={18} color="#0A84FF" />
            Cost by Feature
          </CardTitle>
        </CardHeader>
        <CardContent style={styles.content}>
          <div style={styles.emptyState}>
            No feature-tagged usage yet.
            <br />
            <span style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              Update SDK calls with feature names to see breakdown.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <CardHeader style={styles.header}>
        <CardTitle style={styles.title}>
          <Layers size={18} color="#0A84FF" />
          Cost by Feature
        </CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        {features.map((item) => (
          <div key={item.feature} style={styles.featureRow}>
            <div style={styles.featureName}>
              <div style={{
                ...styles.featureIcon,
                background: `${getFeatureColor(item.feature)}15`,
              }}>
                <DollarSign size={16} color={getFeatureColor(item.feature)} />
              </div>
              <div>
                <div style={styles.featureLabel}>{formatFeatureName(item.feature)}</div>
                <div style={styles.featureMeta}>{item.percentage.toFixed(1)}% of total</div>
              </div>
            </div>
            <div style={styles.costSection}>
              <div style={styles.costAmount}>${item.cost.toFixed(4)}</div>
              <div style={styles.costBar}>
                <div style={{
                  ...styles.costFill,
                  width: `${item.percentage}%`,
                  background: getFeatureColor(item.feature),
                }} />
              </div>
            </div>
          </div>
        ))}
        
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total Tracked</span>
          <span style={styles.totalAmount}>${total.toFixed(4)}</span>
        </div>
      </CardContent>
    </Card>
  );
}