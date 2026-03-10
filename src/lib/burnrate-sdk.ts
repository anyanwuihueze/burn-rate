// BurnRate SDK v2.0 — auto-installed by burnrate-init
// Docs: https://burn-rate-zeta.vercel.app

const SUPABASE_URL = 'https://thbpkpynvoueniovmdop.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnBrcHludm91ZW5pb3ZtZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5MTAsImV4cCI6MjA4NzA4ODkxMH0.tIzHk1eWEd7NrF21jdP6FiwgwEp3EjGikcHC1xs9Lak';

export class BurnRateTracker {
  userId: string;
  budget: number;
  queue: any[];
  timer: any;

  constructor(config: { apiKey: string; monthlyBudget?: number }) {
    const without = (config.apiKey || '').replace(/^br_live_/, '');
    this.userId = without.length >= 36 ? without.substring(0, 36) : without;
    this.budget = config.monthlyBudget || 200;
    this.queue = [];
    this.timer = setInterval(() => this.flush(), 5000);
    if (!this.userId) console.warn('[BurnRate] Invalid API key. Get yours at https://burn-rate-zeta.vercel.app');
  }

  cost(model: string, input: number, output: number): number {
    const p: Record<string, [number, number]> = {
      'gpt-4o': [0.005, 0.015], 'gpt-4o-mini': [0.00015, 0.0006],
      'gpt-4': [0.03, 0.06], 'gpt-3.5-turbo': [0.0005, 0.0015],
      'claude-3-5-sonnet-20241022': [0.003, 0.015], 'claude-3-haiku': [0.00025, 0.00125],
      'claude-3-opus': [0.015, 0.075], 'claude-opus-4': [0.015, 0.075],
      'gemini-2.0-flash': [0.0001, 0.0004], 'gemini-1.5-pro': [0.00125, 0.005],
      'gemini-1.5-flash': [0.000075, 0.0003],
      'llama-3.3-70b-versatile': [0.00059, 0.00079],
      'llama-3.1-8b-instant': [0.00005, 0.00008],
      'mixtral-8x7b-32768': [0.00024, 0.00024],
      'meta/llama-3.3-70b-instruct': [0.00077, 0.00077],
    };
    const [i, o] = p[model] || [0.001, 0.001];
    return ((input * i) + (output * o)) / 1000;
  }

  async track(provider: string, model: string, fn: () => any, feature?: string): Promise<any> {
    const t = Date.now();
    try {
      const res = await fn();
      let inp = 0, out = 0;
      if (res?.usage) {
        inp = res.usage.prompt_tokens || res.usage.input_tokens || 0;
        out = res.usage.completion_tokens || res.usage.output_tokens || 0;
      } else if (res?.usageMetadata) {
        inp = res.usageMetadata.promptTokenCount || 0;
        out = res.usageMetadata.candidatesTokenCount || 0;
      }
      this.queue.push({
        user_id: this.userId, provider, model,
        tokens_input: inp, tokens_output: out,
        cost: this.cost(model, inp, out),
        timestamp: new Date().toISOString(),
        feature: feature || null,
        metadata: { latency_ms: Date.now() - t, status: 'success' }
      });
      void this.flush();
      return res;
    } catch (err: any) {
      this.queue.push({
        user_id: this.userId, provider, model,
        tokens_input: 0, tokens_output: 0, cost: 0,
        timestamp: new Date().toISOString(),
        feature: feature || null,
        metadata: { error: err.message, latency_ms: Date.now() - t, status: 'error' }
      });
      void this.flush();
      throw err;
    }
  }

  trackGroq(model: string, fn: () => any, feature?: string)      { return this.track('groq',      model, fn, feature); }
  trackOpenAI(model: string, fn: () => any, feature?: string)    { return this.track('openai',    model, fn, feature); }
  trackGoogle(model: string, fn: () => any, feature?: string)    { return this.track('google',    model, fn, feature); }
  trackAnthropic(model: string, fn: () => any, feature?: string) { return this.track('anthropic', model, fn, feature); }
  trackNvidia(model: string, fn: () => any, feature?: string)    { return this.track('nvidia',    model, fn, feature); }

  async flush(): Promise<void> {
    if (!this.queue.length) return;
    const batch = [...this.queue];
    this.queue = [];
    try {
      const r = await fetch(SUPABASE_URL + '/functions/v1/track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ metrics: batch }),
      });
      if (!r.ok) this.queue.unshift(...batch);
    } catch { this.queue.unshift(...batch); }
  }

  async stop(): Promise<void> { clearInterval(this.timer); await this.flush(); }
}
