// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SB_URL') || '',
      Deno.env.get('SB_SERVICE_ROLE_KEY') || ''
    );

    const body = await req.json();

    // Support both single entry and batch (SDK sends batch)
    const entries = Array.isArray(body.metrics) ? body.metrics : [body];

    let inserted = 0;
    const errors = [];

    for (const entry of entries) {
      // Validate required fields
      if (!entry.user_id || !entry.provider) {
        errors.push({ entry, error: 'Missing user_id or provider' });
        continue;
      }

      // Build insert object — only include metadata if your schema has it
      const insertData: any = {
        user_id: entry.user_id,
        provider: entry.provider,
        model: entry.model || 'unknown',
        tokens_input: entry.tokens_input || 0,
        tokens_output: entry.tokens_output || 0,
        cost: entry.cost || 0,
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      // Only add metadata if present (some schemas don't have this column)
      if (entry.metadata) {
        insertData.metadata = entry.metadata;
      }

      const { error } = await supabase.from('usage_logs').insert(insertData);

      if (error) {
        console.error('Insert error:', error);
        errors.push({ entry, error: error.message });
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
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