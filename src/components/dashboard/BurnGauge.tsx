"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BurnGaugeProps {
  percentage: number;
  totalBudget: number;
  spent: number;
  className?: string;
}

export const BurnGauge: React.FC<BurnGaugeProps> = ({ percentage, totalBudget, spent, className }) => {
  const [currentValue, setCurrentValue] = useState(0);
  const size = 280;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    const timer = setTimeout(() => setCurrentValue(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const offset = circumference - (currentValue / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct < 80) return 'stroke-[#30D158]'; // Safe
    if (pct < 95) return 'stroke-[#FF9F0A]'; // Warning
    return 'stroke-[#FF453A]'; // Critical
  };

  const glowColor = (pct: number) => {
    if (pct < 80) return 'drop-shadow-[0_0_12px_rgba(48,209,88,0.3)]';
    if (pct < 95) return 'drop-shadow-[0_0_12px_rgba(255,159,10,0.3)]';
    return 'drop-shadow-[0_0_12px_rgba(255,69,58,0.3)]';
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 transition-all duration-1000 ease-out"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/30"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-1000 ease-out",
            getColor(percentage),
            glowColor(percentage)
          )}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest mb-1">
          Burn Percentage
        </span>
        <span className="text-5xl font-bold font-headline tracking-tighter tabular-nums">
          {percentage.toFixed(1)}%
        </span>
        <div className="mt-4 flex flex-col items-center">
          <span className="font-code text-sm text-muted-foreground tabular-nums">
            ${spent.toLocaleString()} / ${totalBudget.toLocaleString()}
          </span>
          <div className="mt-2 h-1 w-12 rounded-full bg-muted/50" />
        </div>
      </div>
    </div>
  );
};
