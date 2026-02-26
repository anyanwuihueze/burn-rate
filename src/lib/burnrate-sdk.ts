// BurnRate SDK - Real-time API usage tracking
// Install: copy this file into your project as burnrate-sdk.ts

interface BurnRateConfig {
  supabaseUrl: string;
  supabaseAnonKey: string; // pass this in — never hardcode
  userId: string;
  monthlyBudget?: number; // optional, defaults to 200
}

interface UsageEntry {
  user_id: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost: number;
  timestamp: string;
  metadata?: any;
}

export class BurnRateTracker {
  private config: BurnRateConfig;
  private queue: UsageEntry[] = [];
  private flushInterval: number = 5000;
  private timer: any;
  private budget: number;

  constructor(config: BurnRateConfig) {
    this.config = config;
    this.budget = config.monthlyBudget ?? 200;
    this.startAutoFlush();
  }

  // Pricing per 1K tokens
  private calculateCost(
    provider: string,
    model: string,
    input: number,
    output: number
  ): number {
    const pricing: Record<string, { input: number; output: number }> = {
      // OpenAI
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      // Anthropic
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
      'claude-opus-4': { input: 0.015, output: 0.075 },
      // Google
      'gemini-pro': { input: 0.000125, output: 0.000375 },
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
      // Groq
      'llama-3.3-70b': { input: 0.00059, output: 0.00079 },
      'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
      'mixtral-8x7b': { input: 0.00024, output: 0.00024 },
      'gemma2-9b-it': { input: 0.0002, output: 0.0002 },
      // NVIDIA
      'meta/llama-3.3-70b-instruct': { input: 0.00077, output: 0.00077 },
      'mistralai/mistral-large-2-instruct': { input: 0.002, output: 0.006 },
    };

    const rate = pricing[model] ?? { input: 0.001, output: 0.001 };
    return ((input * rate.input) + (output * rate.output)) / 1000;
  }

  // Core tracker — wraps any API call
  async track<T>(
    provider: string,
    model: string,
    apiCall: () => Promise<T & { usage?: any; usageMetadata?: any }>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await apiCall();

      let input = 0;
      let output = 0;

      if (response.usage) {
        // OpenAI / Anthropic / Groq / NVIDIA format
        input =
          response.usage.prompt_tokens ??
          response.usage.input_tokens ??
          0;
        output =
          response.usage.completion_tokens ??
          response.usage.output_tokens ??
          0;
      } else if (response.usageMetadata) {
        // Google Gemini format
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
        metadata: {
          latency_ms: Date.now() - startTime,
          response_status: 'success',
        },
      };

      this.queue.push(entry);
      this.flush(); // immediate flush for real-time feel

      return response;
    } catch (error: any) {
      // Still log failed calls so user can see errors in dashboard
      this.queue.push({
        user_id: this.config.userId,
        provider,
        model,
        tokens_input: 0,
        tokens_output: 0,
        cost: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          error: error.message,
          latency_ms: Date.now() - startTime,
          response_status: 'error',
        },
      });
      this.flush();
      throw error;
    }
  }

  // Convenience wrappers per provider
  async trackGoogle(model: string, apiCall: () => Promise<any>) {
    return this.track('google', model, apiCall);
  }

  async trackOpenAI(model: string, apiCall: () => Promise<any>) {
    return this.track('openai', model, apiCall);
  }

  async trackGroq(model: string, apiCall: () => Promise<any>) {
    return this.track('groq', model, apiCall);
  }

  async trackAnthropic(model: string, apiCall: () => Promise<any>) {
    return this.track('anthropic', model, apiCall);
  }

  async trackNvidia(model: string, apiCall: () => Promise<any>) {
    return this.track('nvidia', model, apiCall);
  }

  // Flush queue to Supabase track-usage function
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
            'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
          },
          body: JSON.stringify({ metrics: batch }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('[BurnRate] Failed to flush usage:', error);
        this.queue.unshift(...batch); // re-queue on failure
      }
    } catch (error: any) {
      console.error('[BurnRate] Network error:', error.message);
      this.queue.unshift(...batch);
    }
  }

  // Get current month spend (calls Supabase REST directly)
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
    return data.reduce(
      (sum: number, entry: any) => sum + (entry.cost || 0),
      0
    );
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
    await this.flush(); // final flush before shutdown
  }
}