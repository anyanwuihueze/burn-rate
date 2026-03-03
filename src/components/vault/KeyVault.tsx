"use client";
import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Plus, Key, Trash2, AlertTriangle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APIKey } from '@/types/supabase';

interface KeyVaultProps {
  userId: string;
  apiKeys: APIKey[];
  onKeysChange: () => void;
  onEmergencyRevoke?: (key: APIKey) => void;
}

const providers = [
  { value: 'openai', label: 'OpenAI', color: '#30D158' },
  { value: 'anthropic', label: 'Anthropic', color: '#FF9500' },
  { value: 'google', label: 'Google AI', color: '#0A84FF' },
  { value: 'groq', label: 'Groq', color: '#BF5AF2' },
  { value: 'nvidia', label: 'NVIDIA', color: '#30D158' },
  { value: 'deepseek', label: 'DeepSeek', color: '#555' },
];

export const KeyVault: React.FC<KeyVaultProps> = ({ apiKeys, onKeysChange, onEmergencyRevoke, userId }) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState({ provider: '', key: '', nickname: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const toggleVisibility = (id: string) =>
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddKey = async () => {
    if (!newKey.provider || !newKey.key) { setError('Provider and key are required'); return; }
    setLoading(true); setError(null);
    try {
      const encrypted = btoa(newKey.key);
      const { error: rpcError } = await supabase.rpc('add_api_key', {
        p_user_id: userId,
        p_provider: newKey.provider,
        p_encrypted_key: encrypted,
        p_nickname: newKey.nickname || `${newKey.provider} Key`
      });
      if (rpcError) throw new Error(rpcError.message);
      setIsAdding(false);
      setNewKey({ provider: '', key: '', nickname: '' });
      onKeysChange();
    } catch (err: any) {
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
    } catch (err) { console.error(err); }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '••••••••';
    return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#080808',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f0', padding: '10px 14px',
    fontFamily: "'DM Mono', monospace", fontSize: '13px',
    outline: 'none', borderRadius: '4px', boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none' as const,
  };

  return (
    <>
      {/* Card */}
      <div style={{
        background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px', height: '100%',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Shield size={18} color="#30D158" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px', fontWeight: 600, color: '#f0f0f0' }}>
                Secure API Key Vault
              </span>
            </div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#444', letterSpacing: '0.05em' }}>
              Store and manage your API keys securely
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#f0f0f0', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Key list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {apiKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Key size={40} color="#333" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#444' }}>No API keys stored yet.</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#333', marginTop: '4px' }}>Click + to add your first key.</p>
            </div>
          ) : (
            apiKeys.map(key => {
              const providerColor = providers.find(p => p.value === key.provider)?.color || '#555';
              return (
                <div key={key.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', background: '#080808',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: providerColor, flexShrink: 0 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>
                          {key.nickname}
                        </span>
                        <span style={{
                          fontFamily: "'DM Mono', monospace", fontSize: '9px',
                          letterSpacing: '0.1em', color: providerColor,
                          border: `1px solid ${providerColor}40`,
                          padding: '2px 6px', textTransform: 'uppercase',
                        }}>
                          {key.provider}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#444' }}>
                          {showKeys[key.id] ? atob(key.encrypted_key) : maskKey(key.encrypted_key)}
                        </span>
                        <button onClick={() => toggleVisibility(key.id)}
                          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}>
                          {showKeys[key.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {onEmergencyRevoke && (
                      <button onClick={() => onEmergencyRevoke(key)}
                        title="Emergency Revoke"
                        style={{ background: 'none', border: 'none', color: '#FF453A', cursor: 'pointer', padding: '4px' }}>
                        <AlertTriangle size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteKey(key.id)}
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal overlay */}
      {isAdding && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setIsAdding(false)}>
          <div style={{
            background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px', width: '100%', maxWidth: '440px',
            margin: '0 24px', position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.05em', color: '#f0f0f0', margin: 0 }}>
                  ADD API KEY
                </h2>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#444', marginTop: '4px' }}>
                  Encrypted before storage. Never transmitted.
                </p>
              </div>
              <button onClick={() => setIsAdding(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', marginBottom: '16px',
                background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)',
                fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#FF453A',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: '8px' }}>
                  Provider
                </label>
                <select
                  value={newKey.provider}
                  onChange={e => setNewKey({ ...newKey, provider: e.target.value })}
                  style={selectStyle}
                >
                  <option value="">Select provider</option>
                  {providers.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: '8px' }}>
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={newKey.key}
                  onChange={e => setNewKey({ ...newKey, key: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: '8px' }}>
                  Nickname <span style={{ color: '#333' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Production Key"
                  value={newKey.nickname}
                  onChange={e => setNewKey({ ...newKey, nickname: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setIsAdding(false)} style={{
                  flex: 1, padding: '12px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#666', cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.1em',
                }}>
                  CANCEL
                </button>
                <button onClick={handleAddKey} disabled={loading} style={{
                  flex: 1, padding: '12px',
                  background: '#FF3B30', border: 'none',
                  color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.1em',
                  opacity: loading ? 0.6 : 1,
                }}>
                  {loading ? 'SAVING...' : 'ADD KEY'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};