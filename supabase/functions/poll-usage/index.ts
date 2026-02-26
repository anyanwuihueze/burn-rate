// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────
// POLLING PROVIDERS (require admin/org-level keys)
// ─────────────────────────────────────────────
const POLL_PROVIDERS: Record<string, any> = {

  openai: {
    name: 'OpenAI',
    keyHint: 'Requires an Admin API key from platform.openai.com/settings/organization/admin-keys',
    async fetchUsage(apiKey: string) {
      const startTime = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

      const response = await fetch(
        `https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&bucket_width=1h&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results = [];

      for (const bucket of data.data || []) {
        for (const result of bucket.results || []) {
          results.push({
            model: result.model || 'unknown',
            tokens_input: result.input_tokens || 0,
            tokens_output: result.output_tokens || 0,
            cost:
              ((result.input_tokens || 0) * 0.000003) +
              ((result.output_tokens || 0) * 0.000015),
            timestamp: new Date(bucket.start_time * 1000).toISOString(),
          });
        }
      }

      return results;
    },
  },

  anthropic: {
    name: 'Anthropic',
    keyHint: 'Requires an Admin API key starting with sk-ant-admin...',
    async fetchUsage(apiKey: string) {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${startDate}&ending_at=${endDate}`,
        {
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': apiKey,
            'content-type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results = [];

      for (const item of data.data || []) {
        results.push({
          model: item.model || 'claude-sonnet-4-5',
          tokens_input: item.input_tokens || 0,
          tokens_output: item.output_tokens || 0,
          cost:
            ((item.input_tokens || 0) * 0.003 +
              (item.output_tokens || 0) * 0.015) /
            1000,
          timestamp: item.timestamp || new Date().toISOString(),
        });
      }

      return results;
    },
  },
};

// ─────────────────────────────────────────────
// SDK-ONLY PROVIDERS (no public usage API)
// These are tracked via the BurnRate SDK in user's code
// ─────────────────────────────────────────────
const SDK_ONLY_PROVIDERS = ['google', 'groq', 'nvidia', 'deepseek', 'kimi', 'qwen'];

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SB_URL') || '';
    const supabaseKey = Deno.env.get('SB_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SB_URL or SB_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch all active API keys
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('is_active', true);

    if (keysError) throw keysError;

    if (!apiKeys || apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active API keys found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let totalInserted = 0;

    for (const key of apiKeys) {
      // SDK-only provider — skip polling, inform user
      if (SDK_ONLY_PROVIDERS.includes(key.provider)) {
        results.push({
          provider: key.provider,
          status: 'sdk_required',
          message: `${key.provider} has no public usage API. Add the BurnRate SDK to your app to track ${key.provider} usage automatically.`,
        });
        continue;
      }

      const provider = POLL_PROVIDERS[key.provider];

      // Unknown provider
      if (!provider) {
        results.push({
          provider: key.provider,
          status: 'unknown_provider',
          message: `Provider "${key.provider}" is not supported yet.`,
        });
        continue;
      }

      // Poll the provider
      try {
        const usageData = await provider.fetchUsage(key.encrypted_key);

        for (const entry of usageData) {
          const { error: insertError } = await supabase.from('usage_logs').insert({
            user_id: key.user_id,
            provider: key.provider,
            model: entry.model,
            tokens_input: entry.tokens_input,
            tokens_output: entry.tokens_output,
            cost: entry.cost,
            timestamp: entry.timestamp,
          });

          if (!insertError) totalInserted++;
        }

        // Update last_used timestamp
        await supabase
          .from('api_keys')
          .update({ last_used: new Date().toISOString() })
          .eq('id', key.id);

        results.push({
          provider: key.provider,
          status: 'success',
          entries: usageData.length,
        });

      } catch (error: any) {
        // Log error to polling_errors table
        await supabase.from('polling_errors').insert({
          user_id: key.user_id,
          provider: key.provider,
          api_key_id: key.id,
          error_message: error.message,
          created_at: new Date().toISOString(),
        });

        // Return helpful hint if it's a 401
        const is401 = error.message.includes('401');
        results.push({
          provider: key.provider,
          status: 'error',
          message: error.message,
          hint: is401 ? provider.keyHint : undefined,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_inserted: totalInserted,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});