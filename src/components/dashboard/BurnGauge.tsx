"use client";
import React, { useEffect, useState } from 'react';

interface BurnGaugeProps {
  percentage: number;
  totalBudget: number;
  spent: number;
}

export const BurnGauge: React.FC<BurnGaugeProps> = ({ percentage, totalBudget, spent }) => {
  const [current, setCurrent] = useState(0);
  const size = 280;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    const timer = setTimeout(() => setCurrent(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const offset = circumference - (current / 100) * circumference;
  const color = current < 80 ? '#30D158' : current < 95 ? '#FF9F0A' : '#FF453A';
  const glow = current < 80
    ? '0 0 20px rgba(48,209,88,0.25)'
    : current < 95
    ? '0 0 20px rgba(255,159,10,0.25)'
    : '0 0 20px rgba(255,69,58,0.25)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(${glow})`, transition: 'all 1s ease-out' }}
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
        />
      </svg>

      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '10px', letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#555',
          marginBottom: '6px',
        }}>
          Burn Percentage
        </span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '56px', lineHeight: 1,
          letterSpacing: '0.02em', color,
        }}>
          {current.toFixed(1)}%
        </span>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '12px', color: '#555',
          marginTop: '8px',
        }}>
          ${spent.toFixed(2)} / ${totalBudget.toLocaleString()}
        </span>
        <div style={{
          marginTop: '8px', width: '32px', height: '2px',
          background: color, borderRadius: '2px',
        }} />
      </div>
    </div>
  );
};