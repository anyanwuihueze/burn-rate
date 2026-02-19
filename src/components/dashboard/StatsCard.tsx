"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  label, 
  value, 
  trend, 
  trendValue, 
  icon,
  sparkData = [20, 40, 35, 50, 45, 60, 55],
  color = "text-primary"
}) => {
  return (
    <Card className="p-5 bg-card border-border hover:border-muted-foreground/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-md bg-muted/20", color)}>
            {icon}
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded",
          trend === 'up' ? "text-[#FF453A] bg-[#FF453A]/10" : 
          trend === 'down' ? "text-[#30D158] bg-[#30D158]/10" : 
          "text-muted-foreground bg-muted/20"
        )}>
          {trend === 'up' ? <TrendingUp size={10} /> : trend === 'down' ? <TrendingDown size={10} /> : <Minus size={10} />}
          {trendValue}
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold font-code tabular-nums tracking-tight">
          {value}
        </h3>
      </div>

      <div className="mt-4 h-8 flex items-end gap-[2px]">
        {sparkData.map((v, i) => (
          <div 
            key={i} 
            className={cn(
              "flex-1 rounded-t-sm transition-all duration-500 group-hover:opacity-80",
              trend === 'up' ? "bg-[#FF453A]" : trend === 'down' ? "bg-[#30D158]" : "bg-primary"
            )}
            style={{ height: `${(v / Math.max(...sparkData)) * 100}%` }}
          />
        ))}
      </div>
    </Card>
  );
};
