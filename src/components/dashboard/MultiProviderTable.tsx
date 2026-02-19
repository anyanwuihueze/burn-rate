"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const providers = [
  { name: 'Anthropic', models: 'Claude 3.5 Sonnet', tokens: '14.2M', cost: 423.50, burn: 12.5, status: 'Active' },
  { name: 'OpenAI', models: 'GPT-4o, o1-preview', tokens: '8.1M', cost: 215.12, burn: 8.2, status: 'Active' },
  { name: 'Google', models: 'Gemini 1.5 Pro', tokens: '2.4M', cost: 34.10, burn: 2.1, status: 'Healthy' },
];

export const MultiProviderTable: React.FC = () => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Provider Connectivity</h2>
        <Badge variant="outline" className="font-code text-[10px]">3 Providers Active</Badge>
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
                  {p.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{p.models}</TableCell>
              <TableCell className="text-right font-code tabular-nums text-xs">{p.tokens}</TableCell>
              <TableCell className="text-right font-code tabular-nums text-xs text-[#FF9F0A]">${p.burn}/hr</TableCell>
              <TableCell className="text-right font-code font-bold tabular-nums text-[#F5F5F7]">${p.cost.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
