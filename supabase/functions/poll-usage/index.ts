// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROVIDERS: Record<string, any> = {
  openai: {
    name: 'OpenAI',
    async fetchUsage(apiKey: string) {
      try {
        const startTime = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
        
        const response = await fetch(
          `https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&bucket_width=1h&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
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
              cost: ((result.input_tokens || 0) * 0.000003 + (result.output_tokens || 0) * 0.000015),
              timestamp: new Date(bucket.start_time * 1000).toISOString()
            });
          }
        }

        return results;
      } catch (e) {
        console.error('OpenAI API error:', e.message);
        throw e;
      }
    }
  },

  anthropic: {
    name: 'Anthropic',
    async fetchUsage(apiKey: string) {
      try {
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const response = await fetch(
          `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${startDate}&ending_at=${endDate}`,
          {
            headers: {
              'anthropic-version': '2023-06-01',
              'x-api-key': apiKey,
              'content-type': 'application/json'
            }
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
            cost: ((item.input_tokens || 0) * 0.003 + (item.output_tokens || 0) * 0.015) / 1000,
            timestamp: item.timestamp || new Date().toISOString()
          });
        }

        return results;
      } catch (e) {
        console.error('Anthropic API error:', e.message);
        throw e;
      }
    }
  },

  groq: {
    name: 'Groq',
    async fetchUsage(apiKey: string) {
      throw new Error('Groq does not provide a public usage API. Use the Burn Rate SDK.');
    }
  },

  nvidia: {
    name: 'NVIDIA',
    async fetchUsage(apiKey: string) {
      throw new Error('NVIDIA does not provide a public usage API. Use the Burn Rate SDK.');
    }
  },

  google: {
    name: 'Google',
    async fetchUsage(apiKey: string) {
      throw new Error('Google AI usage tracking not yet implemented.');
    }
  }
};

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
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('is_active', true);

    if (keysError) throw keysError;

    if (!apiKeys || apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active API keys found', results: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const results = [];
    let totalInserted = 0;

    for (const key of apiKeys) {
      const provider = PROVIDERS[key.provider];
      
      if (!provider) {
        results.push({ 
          provider: key.provider, 
          status: 'unknown_provider',
          message: `Provider ${key.provider} not configured`
        });
        continue;
      }

      try {
        const usageData = await provider.fetchUsage(key.encrypted_key);
        
        for (const entry of usageData) {
          const { error: insertError } = await supabase
            .from('usage_logs')
            .insert({
              user_id: key.user_id,
              provider: key.provider,
              model: entry.model,
              tokens_input: entry.tokens_input,
              tokens_output: entry.tokens_output,
              cost: entry.cost,
              timestamp: entry.timestamp
            });

          if (!insertError) totalInserted++;
        }

        await supabase
          .from('api_keys')
          .update({ last_used: new Date().toISOString() })
          .eq('id', key.id);

        results.push({
          provider: key.provider,
          status: 'success',
          entries: usageData.length,
          message: `Fetched ${usageData.length} entries`
        });

      } catch (error: any) {
        await supabase.from('polling_errors').insert({
          user_id: key.user_id,
          provider: key.provider,
          api_key_id: key.id,
          error_message: error.message,
          created_at: new Date().toISOString()
        });

        results.push({ 
          provider: key.provider, 
          status: 'error', 
          message: error.message 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        total_inserted: totalInserted,
        timestamp: new Date().toISOString()
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
});
