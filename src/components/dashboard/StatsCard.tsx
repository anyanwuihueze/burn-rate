"use client";
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  sparkData?: number[];
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label, value, trend, trendValue, icon,
  sparkData = [20, 40, 35, 50, 45, 60, 55],
  color = '#0A84FF',
}) => {
  const trendColor = trend === 'up' ? '#FF453A' : trend === 'down' ? '#30D158' : '#555';
  const barColor = trend === 'up' ? '#FF453A' : trend === 'down' ? '#30D158' : '#0A84FF';
  const maxVal = Math.max(...sparkData);

  // Extract hex from tailwind color prop if passed
  const iconColor = color.startsWith('text-') ? '#0A84FF' : color;

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      transition: 'border-color 0.2s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '6px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '6px',
            color: iconColor,
            display: 'flex', alignItems: 'center',
          }}>
            {icon}
          </div>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#555',
          }}>
            {label}
          </span>
        </div>
        {trendValue && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            fontSize: '10px', fontWeight: 'bold',
            padding: '3px 6px', borderRadius: '4px',
            color: trendColor,
            background: `${trendColor}15`,
            fontFamily: "'DM Mono', monospace",
          }}>
            {trend === 'up' ? <TrendingUp size={10} /> : trend === 'down' ? <TrendingDown size={10} /> : <Minus size={10} />}
            {trendValue}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '28px', fontWeight: 500,
        letterSpacing: '-0.02em', color: '#f0f0f0',
        lineHeight: 1,
      }}>
        {value}
      </div>

      {/* Sparkline */}
      <div style={{ height: '32px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
        {sparkData.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1, borderRadius: '2px 2px 0 0',
              background: barColor,
              opacity: 0.6,
              height: `${(v / maxVal) * 100}%`,
              transition: 'height 0.5s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
};