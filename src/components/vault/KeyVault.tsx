"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Shield, Eye, EyeOff, Plus, Lock, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const KeyVault: React.FC = () => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const keys = [
    { id: '1', provider: 'Anthropic', nickname: 'Production Claude', last4: '4jX9', status: 'In Use' },
    { id: '2', provider: 'OpenAI', nickname: 'Staging GPT', last4: 'k8R2', status: 'Healthy' },
    { id: '3', provider: 'Google', nickname: 'Personal Gemini', last4: 'p0V5', status: 'Inactive' },
  ];

  const toggleVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="border-border bg-card shadow-xl h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="text-[#30D158]" size={20} />
              Secure API Key Vault
            </CardTitle>
            <CardDescription>Encrypted at rest with AES-256. Masked by default.</CardDescription>
          </div>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Plus size={18} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {keys.map((key) => (
            <div key={key.id} className="p-4 rounded-xl border border-border bg-muted/10 group hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-muted-foreground" />
                  <span className="font-bold text-sm tracking-tight">{key.nickname}</span>
                </div>
                <Badge variant="outline" className="text-[9px] font-code bg-background/50 border-muted">
                  {key.provider}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 font-code text-xs bg-background p-2 rounded-md border border-border flex items-center justify-between">
                  <span className="text-muted-foreground tracking-widest">
                    {showKeys[key.id] ? "sk-ant-api03-xxxx-xxxx-xxxx-" + key.last4 : "•••• •••• •••• " + key.last4}
                  </span>
                  <button 
                    onClick={() => toggleVisibility(key.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKeys[key.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreHorizontal size={14} />
                </Button>
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t border-border mt-4">
            <div className="p-3 bg-primary/5 rounded-lg flex items-center gap-3">
              <Shield className="text-primary shrink-0" size={16} />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Your keys never leave your browser. They are used only for authentication with provider endpoints.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
