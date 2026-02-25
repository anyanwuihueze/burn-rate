// Updated types matching new database schema

export interface User {
  id: string;
  email: string;
  display_name?: string;
  monthly_budget: number;
  alert_thresholds: number[];
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: string;
  user_id: string;
  provider: 'anthropic' | 'openai' | 'google' | 'nvidia' | 'groq' | 'deepseek' | 'kimi' | 'qwen' | 'mistral' | 'cohere';
  encrypted_key: string;
  nickname?: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

export interface UsageLog {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  tokens_input: number;  // UPDATED: separate input tokens
  tokens_output: number; // UPDATED: separate output tokens
  cost: number;
  request_type?: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: 'threshold' | 'projection' | 'anomaly';
  message: string;
  threshold?: number;
  dismissed: boolean;
  created_at: string;
}

export interface PollingError {
  id: string;
  provider: string;
  api_key_id?: string;
  error_message: string;
  error_details?: any;
  timestamp: string;
}

// Helper type for provider status
export type ProviderStatus = 
  | 'supported'      // Has usage API (OpenAI, Anthropic)
  | 'sdk_only'       // Requires SDK (Groq, NVIDIA, DeepSeek)
  | 'coming_soon';   // Not yet implemented

export const PROVIDER_INFO: Record<string, { name: string; status: ProviderStatus; needsAdminKey: boolean }> = {
  openai: { name: 'OpenAI', status: 'supported', needsAdminKey: true },
  anthropic: { name: 'Anthropic', status: 'supported', needsAdminKey: true },
  google: { name: 'Google AI', status: 'coming_soon', needsAdminKey: false },
  groq: { name: 'Groq', status: 'sdk_only', needsAdminKey: false },
  nvidia: { name: 'NVIDIA NIM', status: 'sdk_only', needsAdminKey: false },
  deepseek: { name: 'DeepSeek', status: 'sdk_only', needsAdminKey: false },
  kimi: { name: 'Kimi', status: 'coming_soon', needsAdminKey: false },
  qwen: { name: 'Qwen', status: 'coming_soon', needsAdminKey: false },
  mistral: { name: 'Mistral', status: 'coming_soon', needsAdminKey: false },
  cohere: { name: 'Cohere', status: 'coming_soon', needsAdminKey: false },
};