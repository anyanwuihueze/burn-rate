import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';

export async function POST() {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an active key
    const { data: existing } = await supabase
      .from('api_keys')
      .select('key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (existing) {
      return NextResponse.json({ apiKey: existing.key });
    }

    // Generate new key: br_live_UUID_TIMESTAMP_RANDOM
    const random = crypto.randomBytes(8).toString('hex');
    const apiKey = `br_live_${user.id}_${Date.now()}_${random}`;

    // Save to database
    const { error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key: apiKey,
        is_active: true,
        created_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    return NextResponse.json({ apiKey });
  } catch (err: any) {
    console.error('generate-key error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
