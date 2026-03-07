import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ valid: false });

    const supabase = createClient();
    const { data } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('key', apiKey)
      .single();

    return NextResponse.json({ valid: !!data?.is_active, userId: data?.user_id });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
