"use client";

import React, { useState } from 'react';
import { AlertCircle, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AlertBannerProps {
  percentage: number;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ percentage }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || percentage < 80) return null;

  const isCritical = percentage >= 95;
  const isHigh = percentage >= 90;

  const bgColor = isCritical ? 'bg-[#FF453A]' : isHigh ? 'bg-[#FF9F0A]' : 'bg-[#FF9F0A]/80';
  const textColor = 'text-white';
  const label = isCritical ? 'CRITICAL' : 'WARNING';
  const message = isCritical 
    ? 'Budget nearly exhausted. Burn rate accelerating.' 
    : `Monthly budget threshold reached (${percentage.toFixed(1)}%).`;

  return (
    <div className={cn(
      "w-full px-4 py-3 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500 sticky top-0 z-50",
      bgColor,
      textColor
    )}>
      <div className="flex items-center gap-3 max-w-4xl mx-auto w-full">
        <ShieldAlert size={20} className="shrink-0 animate-pulse-slow" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="font-bold text-xs uppercase tracking-tighter bg-white/20 px-1.5 py-0.5 rounded">
            {label}
          </span>
          <p className="text-sm font-medium tracking-tight">
            {message}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="link" size="sm" className="text-white hover:no-underline hidden sm:flex items-center gap-1">
            Increase Limit <ArrowRight size={14} />
          </Button>
          <button 
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
