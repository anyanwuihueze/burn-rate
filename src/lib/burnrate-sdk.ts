// BurnRate SDK - Real-time API usage tracking
interface BurnRateConfig {
    supabaseUrl: string;
    userId: string;
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
    private flushInterval: number = 5000; // 5 seconds for real-time feel
    private timer: any;
    private budget: number = 2000; // Default monthly budget
  
    constructor(config: BurnRateConfig) {
      this.config = config;
      this.startAutoFlush();
    }
  
    // Calculate cost based on provider pricing
    private calculateCost(provider: string, model: string, input: number, output: number): number {
      const pricing: Record<string, { input: number; output: number }> = {
        // OpenAI (per 1K tokens)
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        // Google (per 1K tokens)
        'gemini-pro': { input: 0.000125, output: 0.000375 },
        'gemini-ultra': { input: 0.00125, output: 0.00375 },
        // Groq (per 1M tokens - convert to 1K)
        'llama-3.3-70b': { input: 0.00059, output: 0.00079 },
        'mixtral-8x7b': { input: 0.00024, output: 0.00024 },
        // Anthropic (per 1K tokens)
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      };
  
      const rate = pricing[model] || pricing['gpt-3.5-turbo'] || { input: 0.001, output: 0.001 };
      return ((input * rate.input) + (output * rate.output)) / 1000;
    }
  
    // Track any API call
    async track<T>(
      provider: string,
      model: string,
      apiCall: () => Promise<T & { usage?: any }>
    ): Promise<T> {
      const startTime = Date.now();
      
      try {
        const response = await apiCall();
        
        // Extract usage from various provider formats
        let input = 0;
        let output = 0;
        
        if (response.usage) {
          // OpenAI format
          input = response.usage.prompt_tokens || response.usage.input_tokens || 0;
          output = response.usage.completion_tokens || response.usage.output_tokens || 0;
        } else if (response.usageMetadata) {
          // Google format
          input = response.usageMetadata.promptTokenCount || 0;
          output = response.usageMetadata.candidatesTokenCount || 0;
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
            response_status: 'success'
          }
        };
  
        this.queue.push(entry);
        
        // Immediate flush for real-time feel
        if (this.queue.length >= 1) {
          this.flush();
        }
  
        return response;
      } catch (error) {
        // Log failed calls too
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
            latency_ms: Date.now() - startTime
          }
        });
        throw error;
      }
    }
  
    // Provider-specific wrappers
    async trackGoogle(model: string, apiCall: () => Promise<any>): Promise<any> {
      return this.track('google', model, apiCall);
    }
  
    async trackOpenAI(model: string, apiCall: () => Promise<any>): Promise<any> {
      return this.track('openai', model, apiCall);
    }
  
    async trackGroq(model: string, apiCall: () => Promise<any>): Promise<any> {
      return this.track('groq', model, apiCall);
    }
  
    async trackAnthropic(model: string, apiCall: () => Promise<any>): Promise<any> {
      return this.track('anthropic', model, apiCall);
    }
  
    // Flush to Supabase
    async flush(): Promise<void> {
      if (this.queue.length === 0) return;
  
      const batch = [...this.queue];
      this.queue = [];
  
      try {
        const response = await fetch(
          `${this.config.supabaseUrl}/functions/v1/track-usage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics: batch })
          }
        );
  
        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to track usage:', error);
          // Re-queue on failure
          this.queue.unshift(...batch);
        }
      } catch (error) {
        console.error('Network error tracking usage:', error);
        this.queue.unshift(...batch);
      }
    }
  
    // Real-time stats
    async getCurrentSpend(): Promise<number> {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
  
      const response = await fetch(
        `${this.config.supabaseUrl}/rest/v1/usage_logs?select=cost&user_id=eq.${this.config.userId}&timestamp=gte.${startOfMonth.toISOString()}`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnBrcHludm91ZW5pb3ZtZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5MTAsImV4cCI6MjA4NzA4ODkxMH0.4d9sF91k1J7q4zV8x2Q3mL5nP8rT2wE6yU1iO4pA7sD',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnBrcHludm91ZW5pb3ZtZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5MTAsImV4cCI6MjA4NzA4ODkxMH0.4d9sF91k1J7q4zV8x2Q3mL5nP8rT2wE6yU1iO4pA7sD'
          }
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
      if (this.timer) clearInterval