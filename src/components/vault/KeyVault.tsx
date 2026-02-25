"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Shield, Eye, EyeOff, Plus, Lock, Trash2, Key, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { APIKey } from '@/types/supabase';

interface KeyVaultProps {
  apiKeys: APIKey[];
  onKeysChange: () => void;
  onEmergencyRevoke?: (key: APIKey) => void;
}

export const KeyVault: React.FC<KeyVaultProps> = ({ apiKeys, onKeysChange, onEmergencyRevoke }) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState({ provider: '', key: '', nickname: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const toggleVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const encryptKey = async (key: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('encrypt-key', {
      body: { key }
    });
    if (error) throw error;
    return data.encrypted;
  };

  const handleAddKey = async () => {
    if (!newKey.provider || !newKey.key) {
      setError('Provider and key are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const encrypted = await encryptKey(newKey.key);

      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          provider: newKey.provider,
          encrypted_key: encrypted,
          key_preview: newKey.key.slice(0, 4) + '...' + newKey.key.slice(-4),
          nickname: newKey.nickname || `${newKey.provider} Key`,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
      
      setIsAdding(false);
      setNewKey({ provider: '', key: '', nickname: '' });
      onKeysChange();
    } catch (err: any) {
      console.error('Error adding key:', err);
      setError(err.message || 'Failed to add key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      onKeysChange();
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '••••••••';
    return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
  };

  const providers = [
    { value: 'openai', label: 'OpenAI', color: 'bg-green-500' },
    { value: 'anthropic', label: 'Anthropic', color: 'bg-orange-500' },
    { value: 'google', label: 'Google AI', color: 'bg-blue-500' },
    { value: 'groq', label: 'Groq', color: 'bg-purple-500' },
    { value: 'nvidia', label: 'NVIDIA', color: 'bg-green-600' },
    { value: 'deepseek', label: 'DeepSeek', color: 'bg-gray-500' },
  ];

  return (
    <>
      <Card className="border-border bg-card shadow-xl h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="text-[#30D158]" size={20} />
                Secure API Key Vault
              </CardTitle>
              <CardDescription>Store and manage your API keys securely</CardDescription>
            </div>
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={18} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key size={48} className="mx-auto mb-4 opacity-20" />
                <p>No API keys stored yet.</p>
                <p className="text-sm">Add your first key to start tracking.</p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${providers.find(p => p.value === key.provider)?.color || 'bg-gray-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.nickname}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {key.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        {showKeys[key.id] ? key.key_preview : maskKey(key.encrypted_key)}
                        <button 
                          onClick={() => toggleVisibility(key.id)}
                          className="hover:text-foreground"
                        >
                          {showKeys[key.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEmergencyRevoke && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-[#FF453A] hover:text-[#FF453A] hover:bg-[#FF453A]/10"
                        onClick={() => onEmergencyRevoke(key)}
                        title="Emergency Revoke"
                      >
                        <AlertTriangle size={14} />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteKey(key.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>
              Your key will be encrypted before storage. We never store plain text keys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select 
                value={newKey.provider} 
                onValueChange={(v) => setNewKey({...newKey, provider: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input 
                type="password" 
                placeholder="sk-..." 
                value={newKey.key}
                onChange={(e) => setNewKey({...newKey, key: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Key will be encrypted with AES-256-GCM
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nickname (optional)</label>
              <Input 
                placeholder="Production Key" 
                value={newKey.nickname}
                onChange={(e) => setNewKey({...newKey, nickname: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddKey} disabled={loading}>
              {loading ? 'Encrypting...' : 'Add Key'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
