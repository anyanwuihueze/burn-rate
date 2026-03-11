// BurnRate SDK - Simplified Option B
// Usage: new BurnRateTracker({ apiKey: process.env.BURNRATE_API_KEY || 'br_live_a8fccc8f-13c4-453c-8d10-3ecc77e9fa45_1772718737561_4f8ba36b5b1f' })

interface BurnRateConfig {
  apiKey: string;  // Just ONE thing needed
  monthlyBudget?: number;
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
  private apiKey: string;
  private userId: string;
  private supabaseUrl: string = 'https://thbpkpynvoueniovmdop.supabase.co';
  private queue: UsageEntry[] = [];
  private flushInterval: number = 5000;
  private timer: any;
  private budget: number;

  constructor(config: BurnRateConfig) {
    this.apiKey = config.apiKey;
    this.budget = config.monthlyBudget ?? 200;
    
    // Decode apiKey to get userId (format: br_live_USERID_TIMESTAMP_SIG)
    const parts = config.apiKey.split('_');
    if (parts.length >= 3 && parts[0] === 'br' && parts[1] === 'live') {
      this.userId = parts[2];
    } else {
      throw new Error('Invalid API key format. Get yours from dashboard.');
    }
    
    this.startAutoFlush();
  }

  private calculateCost(provider: string, model: string, input: number, output: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
      'llama-3.3-70b': { input: 0.00059, output: 0.00079 },
      'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
      'meta/llama-3.3-70b-instruct': { input: 0.00077, output: 0.00077 },
    };

    const rate = pricing[model] ?? { input: 0.001, output: 0.001 };
    return ((input * rate.input) + (output * rate.output)) / 1000;
  }

  async track<T>(
    provider: string,
    model: string,
    apiCall: () => Promise<T & { usage?: any; usageMetadata?: any }>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await apiCall();

      let input = 0, output = 0;
      if (response.usage) {
        input = response.usage.prompt_tokens ?? response.usage.input_tokens ?? 0;
        output = response.usage.completion_tokens ?? response.usage.output_tokens ?? 0;
      } else if (response.usageMetadata) {
        input = response.usageMetadata.promptTokenCount ?? 0;
        output = response.usageMetadata.candidatesTokenCount ?? 0;
      }

      const cost = this.calculateCost(provider, model, input, output);

      this.queue.push({
        user_id: this.userId,
        provider,
        model,
        tokens_input: input,
        tokens_output: output,
        cost,
        timestamp: new Date().toISOString(),
        metadata: { latency_ms: Date.now() - startTime, response_status: 'success' },
      });

      this.flush();
      return response;
    } catch (error: any) {
      this.queue.push({
        user_id: this.userId,
        provider,
        model,
        tokens_input: 0,
        tokens_output: 0,
        cost: 0,
        timestamp: new Date().toISOString(),
        metadata: { error: error.message, latency_ms: Date.now() - startTime, response_status: 'error' },
      });
      this.flush();
      throw error;
    }
  }

  async trackGroq(model: string, apiCall: () => Promise<any>) {
    return this.track('groq', model, apiCall);
  }

  async trackGoogle(model: string, apiCall: () => Promise<any>) {
    return this.track('google', model, apiCall);
  }

  async trackOpenAI(model: string, apiCall: () => Promise<any>) {
    return this.track('openai', model, apiCall);
  }

  async trackAnthropic(model: string, apiCall: () => Promise<any>) {
    return this.track('anthropic', model, apiCall);
  }

  async trackNvidia(model: string, apiCall: () => Promise<any>) {
    return this.track('nvidia', model, apiCall);
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/track-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ metrics: batch }),
        }
      );

      if (!response.ok) {
        console.error('[BurnRate] Flush failed:', await response.text());
        this.queue.unshift(...batch);
      }
    } catch (error: any) {
      console.error('[BurnRate] Network error:', error.message);
      this.queue.unshift(...batch);
    }
  }

  private startAutoFlush(): void {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }
}
