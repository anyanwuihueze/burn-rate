"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const TestDataForm = () => {
  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('claude-3-sonnet');
  const [tokens, setTokens] = useState(1000);
  const [cost, setCost] = useState(0.015);
  const supabase = createClient();

  const addTestData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('usage_logs').insert({
      user_id: user.id,
      provider,
      model,
      tokens_input: Math.floor(tokens * 0.7),
      tokens_output: Math.floor(tokens * 0.3),
      cost,
      timestamp: new Date().toISOString()
    });

    setTokens(1000);
    setCost(0.015);
  };

  return (
    <div className="p-4 border border-border rounded-lg bg-card space-y-3">
      <h3 className="font-bold text-sm">Dev: Add Test Usage</h3>
      
      <Select value={provider} onValueChange={setProvider}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="anthropic">Anthropic</SelectItem>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="google">Google</SelectItem>
          <SelectItem value="cohere">Cohere</SelectItem>
          <SelectItem value="mistral">Mistral</SelectItem>
        </SelectContent>
      </Select>

      <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
      <Input type="number" placeholder="Tokens" value={tokens} onChange={(e) => setTokens(Number(e.target.value))} />
      <Input type="number" step="0.001" placeholder="Cost ($)" value={cost} onChange={(e) => setCost(Number(e.target.value))} />

      <Button onClick={addTestData} className="w-full">Add Test Data</Button>
    </div>
  );
};
