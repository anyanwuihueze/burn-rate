import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fallback to dummy values to prevent crash during initialization
  // but log a warning for the developer.
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are missing. Dashboard will run in demo mode.');
  }

  return createBrowserClient(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseKey || 'placeholder-key'
  )
}
