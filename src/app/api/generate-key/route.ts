import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await supabase.from('api_keys').select('key').eq('user_id', user.id).eq('is_active', true).single();
  if (existing.data) return NextResponse.json({ apiKey: existing.data.key });

  const apiKey = `br_live_${user.id}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  await supabase.from('api_keys').insert({ user_id: user.id, key: apiKey, is_active: true });
  return NextResponse.json({ apiKey });
}
