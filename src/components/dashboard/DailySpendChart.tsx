"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar } from 'lucide-react';

interface DailySpend {
  date: string;
  cost: number;
}

interface DailySpendChartProps {
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
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '120px',
    gap: '8px',
    padding: '10px 0',
  },
  barWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  bar: {
    width: '100%',
    background: 'linear-gradient(to top, #0A84FF, #0A84FF55)',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease',
    minHeight: '4px',
  },
  barLabel: {
    fontSize: '10px',
    color: '#666',
    fontFamily: "'DM Mono', monospace",
  },
  tooltip: {
    position: 'absolute',
    background: 'rgba(0,0,0,0.9)',
    color: '#f0f0f0',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: "'DM Mono', monospace",
    border: '1px solid rgba(255,255,255,0.1)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: '14px',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f0f0f0',
    fontFamily: "'DM Mono', monospace",
  },
  statLabel: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

export function DailySpendChart({ userId, supabaseUrl, supabaseAnonKey }: DailySpendChartProps) {
  const [dailyData, setDailyData] = useState<DailySpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchDailySpend();
  }, [userId]);

  const fetchDailySpend = async () => {
    if (!userId) return;
    
    try {
      const days = 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/usage_logs?select=timestamp,cost&user_id=eq.${userId}&timestamp=gte.${startDate.toISOString()}`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      const daily: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        daily[d.toISOString().split('T')[0]] = 0;
      }
      
      for (const entry of data) {
        const date = entry.timestamp.split('T')[0];
        daily[date] = (daily[date] || 0) + (entry.cost || 0);
      }
      
      const sorted = Object.entries(daily)
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyData(sorted);
    } catch (error) {
      console.error('[DailySpend] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxCost = Math.max(...dailyData.map(d => d.cost), 0.01);
  const totalWeek = dailyData.reduce((sum, d) => sum + d.cost, 0);
  const avgDaily = totalWeek / (dailyData.length || 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
  };

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    setHoveredIndex(index);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <CardTitle style={styles.title}>
            <Calendar size={18} color="#BF5AF2" />
            7-Day Trend
          </CardTitle>
        </CardHeader>
        <CardContent style={styles.content}>
          <div style={styles.emptyState}>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (dailyData.length === 0 || totalWeek === 0) {
    return (
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <CardTitle style={styles.title}>
            <Calendar size={18} color="#BF5AF2" />
            7-Day Trend
          </CardTitle>
        </CardHeader>
        <CardContent style={styles.content}>
          <div style={styles.emptyState}>
            <TrendingUp size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>No usage data yet.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <CardHeader style={styles.header}>
        <CardTitle style={styles.title}>
          <Calendar size={18} color="#BF5AF2" />
          7-Day Trend
        </CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        <div style={styles.chartContainer}>
          {dailyData.map((day, index) => {
            const height = (day.cost / maxCost) * 100;
            const isHovered = hoveredIndex === index;
            
            return (
              <div 
                key={day.date} 
                style={styles.barWrapper}
                onMouseEnter={(e) => handleMouseMove(e, index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onMouseMove={(e) => handleMouseMove(e, index)}
              >
                <div style={{
                  ...styles.bar,
                  height: `${Math.max(height, 4)}%`,
                  opacity: isHovered ? 1 : 0.7,
                  background: isHovered 
                    ? 'linear-gradient(to top, #30D158, #30D15855)' 
                    : 'linear-gradient(to top, #0A84FF, #0A84FF55)',
                }} />
                <span style={styles.barLabel}>{formatDate(day.date)}</span>
              </div>
            );
          })}
        </div>

        {hoveredIndex !== null && (
          <div style={{
            ...styles.tooltip,
            left: mousePos.x - 40,
            top: mousePos.y - 60,
          }}>
            ${dailyData[hoveredIndex].cost.toFixed(4)}
          </div>
        )}

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>${totalWeek.toFixed(2)}</div>
            <div style={styles.statLabel}>Week Total</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>${avgDaily.toFixed(2)}</div>
            <div style={styles.statLabel}>Daily Avg</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{dailyData.length}</div>
            <div style={styles.statLabel}>Days</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}