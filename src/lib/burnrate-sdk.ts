// BurnRate SDK v2.0 - Real-time API usage tracking + Budget Alerts + Feature Tagging + Model Comparison
// Install: copy this file into your project as burnrate-sdk.ts

interface BurnRateConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
  monthlyBudget?: number; // defaults to 200
  // NEW: Alert configuration
  alertConfig?: {
    email?: string;           // Email for budget alerts
    slackWebhook?: string;    // Slack webhook URL for notifications
    alertThresholds?: number[]; // Percentages to alert at (e.g., [50, 80, 95])
  };
}

interface UsageEntry {
  user_id: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost: number;
  timestamp: string;
  feature?: string;         // NEW: Which feature triggered this call
  metadata?: any;
}

interface ModelComparison {
  currentModel: string;
  currentCost: number;
  alternatives: Array<{
    model: string;
    estimatedCost: number;
    savings: number;
    savingsPercent: number;
  }>;
}

export class BurnRateTracker {
  private config: BurnRateConfig;
  private queue: UsageEntry[] = [];
  private flushInterval: number = 5000;
  private timer: any;
  private budget: number;
  private alertedThresholds: Set<number> = new Set(); // Track which alerts fired

  constructor(config: BurnRateConfig) {
    this.config = config;
    this.budget = config.monthlyBudget ?? 200;
    this.startAutoFlush();
  }

  // Enhanced pricing per 1K tokens
  private pricing: Record<string, { input: number; output: number; quality?: string }> = {
    // OpenAI
    'gpt-4': { input: 0.03, output: 0.06, quality: 'high' },
    'gpt-4-turbo': { input: 0.01, output: 0.03, quality: 'high' },
    'gpt-4o': { input: 0.005, output: 0.015, quality: 'high' },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006, quality: 'medium' },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, quality: 'medium' },
    // Anthropic
    'claude-3-opus': { input: 0.015, output: 0.075, quality: 'high' },
    'claude-3-sonnet': { input: 0.003, output: 0.015, quality: 'high' },
    'claude-3-haiku': { input: 0.00025, output: 0.00125, quality: 'fast' },
    'claude-sonnet-4-5': { input: 0.003, output: 0.015, quality: 'high' },
    'claude-opus-4': { input: 0.015, output: 0.075, quality: 'high' },
    // Google
    'gemini-pro': { input: 0.000125, output: 0.000375, quality: 'medium' },
    'gemini-1.5-pro': { input: 0.00125, output: 0.005, quality: 'high' },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003, quality: 'fast' },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004, quality: 'fast' },
    // Groq
    'llama-3.3-70b': { input: 0.00059, output: 0.00079, quality: 'high' },
    'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008, quality: 'fast' },
    'mixtral-8x7b': { input: 0.00024, output: 0.00024, quality: 'medium' },
    'gemma2-9b-it': { input: 0.0002, output: 0.0002, quality: 'fast' },
    // NVIDIA
    'meta/llama-3.3-70b-instruct': { input: 0.00077, output: 0.00077, quality: 'high' },
    'mistralai/mistral-large-2-instruct': { input: 0.002, output: 0.006, quality: 'high' },
  };

  private calculateCost(provider: string, model: string, input: number, output: number): number {
    const rate = this.pricing[model] ?? { input: 0.001, output: 0.001 };
    return ((input * rate.input) + (output * rate.output)) / 1000;
  }

  // NEW: Calculate what this call would cost on different models
  compareModels(provider: string, currentModel: string, input: number, output: number): ModelComparison {
    const currentCost = this.calculateCost(provider, currentModel, input, output);
    
    // Find comparable models (same quality tier or provider)
    const currentTier = this.pricing[currentModel]?.quality || 'medium';
    const alternatives = Object.entries(this.pricing)
      .filter(([model, info]) => model !== currentModel)
      .map(([model, info]) => {
        const estimatedCost = ((input * info.input) + (output * info.output)) / 1000;
        const savings = currentCost - estimatedCost;
        return {
          model,
          estimatedCost,
          savings,
          savingsPercent: currentCost > 0 ? (savings / currentCost) * 100 : 0,
        };
      })
      .filter(alt => alt.savings > 0) // Only show savings
      .sort((a, b) => b.savings - a.savings) // Best savings first
      .slice(0, 3); // Top 3

    return {
      currentModel,
      currentCost,
      alternatives,
    };
  }

  // NEW: Check budget and send alerts
  private async checkBudgetAlerts(currentSpend: number): Promise<void> {
    if (!this.config.alertConfig) return;
    
    const thresholds = this.config.alertConfig.alertThresholds ?? [50, 80, 95];
    const percentage = (currentSpend / this.budget) * 100;
    
    for (const threshold of thresholds) {
      if (percentage >= threshold && !this.alertedThresholds.has(threshold)) {
        this.alertedThresholds.add(threshold);
        await this.sendAlert(threshold, currentSpend, percentage);
      }
    }
  }

  // NEW: Send alert via email/Slack
  private async sendAlert(threshold: number, spend: number, percentage: number): Promise<void> {
    const message = {
      type: 'budget_alert',
      userId: this.config.userId,
      threshold,
      currentSpend: spend.toFixed(4),
      budget: this.budget,
      percentage: percentage.toFixed(1),
      timestamp: new Date().toISOString(),
    };

    // Send to Slack if configured
    if (this.config.alertConfig?.slackWebhook) {
      try {
        await fetch(this.config.alertConfig.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 BurnRate Alert: ${threshold}% budget reached`,
            attachments: [{
              color: threshold >= 90 ? 'danger' : threshold >= 75 ? 'warning' : 'good',
              fields: [
                { title: 'Current Spend', value: `$${spend.toFixed(4)}`, short: true },
                { title: 'Budget', value: `$${this.budget}`, short: true },
                { title: 'Usage', value: `${percentage.toFixed(1)}%`, short: true },
              ],
            }],
          }),
        });
      } catch (e) {
        console.error('[BurnRate] Slack alert failed:', e);
      }
    }

    // Store alert in Supabase for email processing
    try {
      await fetch(`${this.config.supabaseUrl}/rest/v1/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: this.config.userId,
          alert_type: 'budget_threshold',
          threshold,
          message: JSON.stringify(message),
          sent_to: this.config.alertConfig?.email,
          created_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('[BurnRate] Alert storage failed:', e);
    }
  }

  // UPDATED: Core tracker with feature tagging
  async track<T>(
    provider: string,
    model: string,
    apiCall: () => Promise<T & { usage?: any; usageMetadata?: any }>,
    options?: { feature?: string; compareModels?: boolean } // NEW: Feature tagging
  ): Promise<T & { modelComparison?: ModelComparison }> { // NEW: Returns comparison
    const startTime = Date.now();

    try {
      const response = await apiCall();

      let input = 0;
      let output = 0;

      if (response.usage) {
        input = response.usage.prompt_tokens ?? response.usage.input_tokens ?? 0;
        output = response.usage.completion_tokens ?? response.usage.output_tokens ?? 0;
      } else if (response.usageMetadata) {
        input = response.usageMetadata.promptTokenCount ?? 0;
        output = response.usageMetadata.candidatesTokenCount ?? 0;
      }

      const cost = this.calculateCost(provider, model, input, output);

      const entry: UsageEntry = {
        user_id: this.config.userId,
        provider,
        model,
        tokens_input: input,
        tokens_output: output,
        cost,
        timestamp: new Date().toISOString(),
        feature: options?.feature, // NEW: Tag with feature name
        metadata: {
          latency_ms: Date.now() - startTime,
          response_status: 'success',
        },
      };

      this.queue.push(entry);
      this.flush();

      // NEW: Check budget after tracking
      const currentSpend = await this.getCurrentSpend();
      await this.checkBudgetAlerts(currentSpend);

      // NEW: Return model comparison if requested
      const result: any = { ...response };
      if (options?.compareModels) {
        result.modelComparison = this.compareModels(provider, model, input, output);
      }

      return result;
    } catch (error: any) {
      this.queue.push({
        user_id: this.config.userId,
        provider,
        model,
        tokens_input: 0,
        tokens_output: 0,
        cost: 0,
        timestamp: new Date().toISOString(),
        feature: options?.feature,
        metadata: { error: error.message, latency_ms: Date.now() - startTime, response_status: 'error' },
      });
      this.flush();
      throw error;
    }
  }

  // Convenience wrappers - UPDATED with feature support
  async trackGoogle(model: string, apiCall: () => Promise<any>, feature?: string) {
    return this.track('google', model, apiCall, { feature });
  }

  async trackOpenAI(model: string, apiCall: () => Promise<any>, feature?: string) {
    return this.track('openai', model, apiCall, { feature });
  }

  async trackGroq(model: string, apiCall: () => Promise<any>, feature?: string) {
    return this.track('groq', model, apiCall, { feature });
  }

  async trackAnthropic(model: string, apiCall: () => Promise<any>, feature?: string) {
    return this.track('anthropic', model, apiCall, { feature });
  }

  async trackNvidia(model: string, apiCall: () => Promise<any>, feature?: string) {
    return this.track('nvidia', model, apiCall, { feature });
  }

  // NEW: Get cost breakdown by feature
  async getCostByFeature(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const start = startDate?.toISOString() ?? new Date(new Date().setDate(1)).toISOString();
    const end = endDate?.toISOString() ?? new Date().toISOString();

    const response = await fetch(
      `${this.config.supabaseUrl}/rest/v1/usage_logs?select=feature,cost&user_id=eq.${this.config.userId}&timestamp=gte.${start}&timestamp=lte.${end}`,
      {
        headers: {
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
        },
      }
    );

    const data = await response.json();
    const breakdown: Record<string, number> = {};
    
    for (const entry of data) {
      const feature = entry.feature || 'untagged';
      breakdown[feature] = (breakdown[feature] || 0) + (entry.cost || 0);
    }
    
    return breakdown;
  }

  // NEW: Get spending trends
  async getDailySpend(days: number = 30): Promise<Array<{ date: string; cost: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response = await fetch(
      `${this.config.supabaseUrl}/rest/v1/usage_logs?select=timestamp,cost&user_id=eq.${this.config.userId}&timestamp=gte.${startDate.toISOString()}`,
      {
        headers: {
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
        },
      }
    );

    const data = await response.json();
    const daily: Record<string, number> = {};
    
    for (const entry of data) {
      const date = entry.timestamp.split('T')[0];
      daily[date] = (daily[date] || 0) + (entry.cost || 0);
    }
    
    return Object.entries(daily)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(
        `${this.config.supabaseUrl}/functions/v1/track-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.supabaseAnonKey}`,
          },
          body: JSON.stringify({ metrics: batch }),
        }
      );

      if (!response.ok) {
        console.error('[BurnRate] Failed to flush:', await response.text());
        this.queue.unshift(...batch);
      }
    } catch (error: any) {
      console.error('[BurnRate] Network error:', error.message);
      this.queue.unshift(...batch);
    }
  }

  async getCurrentSpend(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const response = await fetch(
      `${this.config.supabaseUrl}/rest/v1/usage_logs?select=cost&user_id=eq.${this.config.userId}&timestamp=gte.${startOfMonth.toISOString()}`,
      {
        headers: {
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
        },
      }
    );

    const data = await response.json();
    return data.reduce((sum: number, entry: any) => sum + (entry.cost || 0), 0);
  }

  getRemainingBudget(currentSpend: number): number {
    return this.budget - currentSpend;
  }

  getBurnPercentage(currentSpend: number): number {
    return Math.min((currentSpend / this.budget) * 100, 100);
  }

  private startAutoFlush(): void {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }
}

// NEW: React Hook for easy integration
import { useState, useEffect } from 'react';

export function useBurnRate(config: BurnRateConfig) {
  const [tracker] = useState(() => new BurnRateTracker(config));
  const [spend, setSpend] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateSpend = async () => {
      const current = await tracker.getCurrentSpend();
      setSpend(current);
    };
    updateSpend();
    const interval = setInterval(updateSpend, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [tracker]);

  return {
    tracker,
    spend,
    percentage: tracker.getBurnPercentage(spend),
    remaining: tracker.getRemainingBudget(spend),
    refresh: async () => {
      setLoading(true);
      const current = await tracker.getCurrentSpend();
      setSpend(current);
      setLoading(false);
    },
    loading,
  };
}