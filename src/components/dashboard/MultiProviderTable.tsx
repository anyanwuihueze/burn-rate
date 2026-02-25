"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UsageLog } from '@/types/supabase';

interface MultiProviderTableProps {
  usageLogs: UsageLog[];
}

export const MultiProviderTable: React.FC<MultiProviderTableProps> = ({ usageLogs }) => {
  // Aggregate data by provider
  const providerStats: Record<string, {
    models: Set<string>;
    tokens: number;
    cost: number;
    logs: UsageLog[];
  }> = {};

  usageLogs.forEach(log => {
    if (!providerStats[log.provider]) {
      providerStats[log.provider] = {
        models: new Set(),
        tokens: 0,
        cost: 0,
        logs: []
      };
    }
    providerStats[log.provider].models.add(log.model);
    providerStats[log.provider].tokens += log.tokens_input + log.tokens_output;
    providerStats[log.provider].cost += log.cost;
    providerStats[log.provider].logs.push(log);
  });

  const providers = Object.entries(providerStats).map(([name, stats]) => ({
    name,
    models: Array.from(stats.models).join(', '),
    tokens: stats.tokens,
    cost: stats.cost,
    burn: stats.cost / (new Date().getDate() * 24), // hourly burn
    status: 'Active' as const
  }));

  // If no data, show placeholder
  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Provider Connectivity</h2>
          <Badge variant="outline" className="font-code text-[10px]">No Data</Badge>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          <p>No usage data yet. Add API keys to start tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Provider Connectivity</h2>
        <Badge variant="outline" className="font-code text-[10px]">{providers.length} Providers Active</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Provider</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Active Models</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Tokens</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Burn Rate</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Monthly Spend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((p) => (
            <TableRow key={p.name} className="group border-border hover:bg-muted/10">
              <TableCell className="font-bold py-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    p.status === 'Active' ? "bg-primary" : "bg-[#30D158]"
                  )} />
                  {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{p.models}</TableCell>
              <TableCell className="text-right font-code tabular-nums text-xs">{(p.tokens / 1000000).toFixed(1)}M</TableCell>
              <TableCell className="text-right font-code tabular-nums text-xs text-[#FF9F0A]">${p.burn.toFixed(2)}/hr</TableCell>
              <TableCell className="text-right font-code font-bold tabular-nums text-[#F5F5F7]">${p.cost.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};