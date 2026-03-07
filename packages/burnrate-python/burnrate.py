# BurnRate SDK v2.0 — Python
# pip install burnrate-sdk
# Docs: https://burn-rate-zeta.vercel.app

import time
import threading
import json
from datetime import datetime
from typing import Callable, Optional, Any
try:
    import urllib.request as urllib_request
    import urllib.error as urllib_error
except ImportError:
    pass

SUPABASE_URL = 'https://thbpkpynvoueniovmdop.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnBrcHludm91ZW5pb3ZtZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5MTAsImV4cCI6MjA4NzA4ODkxMH0.tIzHk1eWEd7NrF21jdP6FiwgwEp3EjGikcHC1xs9Lak'

PRICING = {
    # OpenAI
    'gpt-4o':           (0.005,   0.015),
    'gpt-4o-mini':      (0.00015, 0.0006),
    'gpt-4':            (0.03,    0.06),
    'gpt-3.5-turbo':    (0.0005,  0.0015),
    # Anthropic
    'claude-3-5-sonnet-20241022': (0.003,   0.015),
    'claude-3-haiku':             (0.00025, 0.00125),
    'claude-3-opus':              (0.015,   0.075),
    'claude-opus-4':              (0.015,   0.075),
    'claude-sonnet-4-5':          (0.003,   0.015),
    # Google
    'gemini-2.0-flash':  (0.0001,  0.0004),
    'gemini-1.5-pro':    (0.00125, 0.005),
    'gemini-1.5-flash':  (0.000075,0.0003),
    # Groq
    'llama-3.3-70b-versatile':  (0.00059, 0.00079),
    'llama-3.1-8b-instant':     (0.00005, 0.00008),
    'mixtral-8x7b-32768':       (0.00024, 0.00024),
    # NVIDIA
    'meta/llama-3.3-70b-instruct': (0.00077, 0.00077),
}


class BurnRateTracker:
    """
    BurnRate Python SDK — tracks AI API usage and cost per feature.

    Usage:
        tracker = BurnRateTracker(api_key="br_live_...")

        # Sync
        response = tracker.track_openai("gpt-4o", lambda: client.chat.completions.create(...), feature="search")

        # Async
        response = await tracker.track_openai_async("gpt-4o", lambda: client.chat.completions.create(...), feature="search")
    """

    def __init__(self, api_key: str, monthly_budget: float = 200.0):
        without_prefix = api_key.replace('br_live_', '')
        self.user_id = without_prefix[:36] if len(without_prefix) >= 36 else without_prefix
        self.budget = monthly_budget
        self._queue = []
        self._lock = threading.Lock()
        if not self.user_id:
            print('[BurnRate] Invalid API key. Get yours at https://burn-rate-zeta.vercel.app')
        # Auto-flush every 5 seconds
        self._timer = threading.Timer(5.0, self._auto_flush)
        self._timer.daemon = True
        self._timer.start()

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        rates = PRICING.get(model, (0.001, 0.001))
        return ((input_tokens * rates[0]) + (output_tokens * rates[1])) / 1000

    def _extract_tokens(self, response: Any):
        """Extract token counts from any provider's response object."""
        input_tokens, output_tokens = 0, 0
        # OpenAI / Groq style
        if hasattr(response, 'usage') and response.usage:
            usage = response.usage
            input_tokens  = getattr(usage, 'prompt_tokens',     0) or getattr(usage, 'input_tokens',  0)
            output_tokens = getattr(usage, 'completion_tokens', 0) or getattr(usage, 'output_tokens', 0)
        # Anthropic style
        elif hasattr(response, 'usage') and hasattr(response.usage, 'input_tokens'):
            input_tokens  = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
        # Google Gemini style
        elif hasattr(response, 'usage_metadata'):
            meta = response.usage_metadata
            input_tokens  = getattr(meta, 'prompt_token_count',     0)
            output_tokens = getattr(meta, 'candidates_token_count', 0)
        return input_tokens, output_tokens

    def _enqueue(self, provider: str, model: str, input_tokens: int, output_tokens: int,
                 cost: float, latency_ms: int, status: str, feature: Optional[str], error: Optional[str] = None):
        entry = {
            'user_id':       self.user_id,
            'provider':      provider,
            'model':         model,
            'tokens_input':  input_tokens,
            'tokens_output': output_tokens,
            'cost':          cost,
            'timestamp':     datetime.utcnow().isoformat() + 'Z',
            'feature':       feature,
            'metadata': {
                'latency_ms': latency_ms,
                'status':     status,
            }
        }
        if error:
            entry['metadata']['error'] = error
        with self._lock:
            self._queue.append(entry)

    def flush(self):
        """Flush queued usage entries to BurnRate."""
        with self._lock:
            if not self._queue:
                return
            batch = list(self._queue)
            self._queue.clear()

        try:
            payload = json.dumps({'metrics': batch}).encode('utf-8')
            req = urllib_request.Request(
                f'{SUPABASE_URL}/functions/v1/track-usage',
                data=payload,
                headers={
                    'Content-Type':  'application/json',
                    'Authorization': f'Bearer {SUPABASE_KEY}',
                },
                method='POST'
            )
            with urllib_request.urlopen(req, timeout=10) as resp:
                if resp.status != 200:
                    with self._lock:
                        self._queue.extend(batch)
        except Exception as e:
            print(f'[BurnRate] Flush error: {e}')
            with self._lock:
                self._queue.extend(batch)

    def _auto_flush(self):
        self.flush()
        self._timer = threading.Timer(5.0, self._auto_flush)
        self._timer.daemon = True
        self._timer.start()

    def track(self, provider: str, model: str, fn: Callable, feature: Optional[str] = None) -> Any:
        """
        Sync tracker — wraps any AI API call.
        response = tracker.track('openai', 'gpt-4o', lambda: client.chat.completions.create(...), feature='search')
        """
        start = time.time()
        try:
            response = fn()
            latency  = int((time.time() - start) * 1000)
            inp, out = self._extract_tokens(response)
            cost     = self._calculate_cost(model, inp, out)
            self._enqueue(provider, model, inp, out, cost, latency, 'success', feature)
            self.flush()
            return response
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            self._enqueue(provider, model, 0, 0, 0.0, latency, 'error', feature, error=str(e))
            self.flush()
            raise

    async def track_async(self, provider: str, model: str, fn: Callable, feature: Optional[str] = None) -> Any:
        """
        Async tracker — wraps any async AI API call.
        response = await tracker.track_async('anthropic', 'claude-3-5-sonnet', lambda: client.messages.create(...), feature='chat')
        """
        import asyncio
        start = time.time()
        try:
            result = fn()
            # Support both coroutines and regular callables
            if asyncio.iscoroutine(result):
                response = await result
            else:
                response = result
            latency  = int((time.time() - start) * 1000)
            inp, out = self._extract_tokens(response)
            cost     = self._calculate_cost(model, inp, out)
            self._enqueue(provider, model, inp, out, cost, latency, 'success', feature)
            self.flush()
            return response
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            self._enqueue(provider, model, 0, 0, 0.0, latency, 'error', feature, error=str(e))
            self.flush()
            raise

    # ── Convenience wrappers ─────────────────────────────────

    def track_openai(self, model: str, fn: Callable, feature: Optional[str] = None):
        return self.track('openai', model, fn, feature)

    def track_anthropic(self, model: str, fn: Callable, feature: Optional[str] = None):
        return self.track('anthropic', model, fn, feature)

    def track_google(self, model: str, fn: Callable, feature: Optional[str] = None):
        return self.track('google', model, fn, feature)

    def track_groq(self, model: str, fn: Callable, feature: Optional[str] = None):
        return self.track('groq', model, fn, feature)

    def track_nvidia(self, model: str, fn: Callable, feature: Optional[str] = None):
        return self.track('nvidia', model, fn, feature)

    async def track_openai_async(self, model: str, fn: Callable, feature: Optional[str] = None):
        return await self.track_async('openai', model, fn, feature)

    async def track_anthropic_async(self, model: str, fn: Callable, feature: Optional[str] = None):
        return await self.track_async('anthropic', model, fn, feature)

    async def track_google_async(self, model: str, fn: Callable, feature: Optional[str] = None):
        return await self.track_async('google', model, fn, feature)

    async def track_groq_async(self, model: str, fn: Callable, feature: Optional[str] = None):
        return await self.track_async('groq', model, fn, feature)

    def stop(self):
        """Stop auto-flush and flush remaining queue."""
        if self._timer:
            self._timer.cancel()
        self.flush()

    def __del__(self):
        try:
            self.stop()
        except Exception:
            pass


# ── Context manager support ──────────────────────────────────
class tracked:
    """
    Context manager for one-off tracking without keeping a tracker instance.

    with tracked(api_key="br_live_...", provider="openai", model="gpt-4o", feature="search") as t:
        response = t.call(lambda: client.chat.completions.create(...))
    """
    def __init__(self, api_key: str, provider: str, model: str, feature: Optional[str] = None):
        self.tracker  = BurnRateTracker(api_key)
        self.provider = provider
        self.model    = model
        self.feature  = feature

    def __enter__(self):
        return self

    def call(self, fn: Callable) -> Any:
        return self.tracker.track(self.provider, self.model, fn, self.feature)

    def __exit__(self, *args):
        self.tracker.stop()