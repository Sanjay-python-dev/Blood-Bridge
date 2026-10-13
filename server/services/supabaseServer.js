import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

let serverSupabaseClient = null;

/**
 * Checks if Supabase server-side credentials are configured with valid non-placeholder values.
 */
export function isSupabaseConfiguredServer() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    !key.includes('your-anon-key') &&
    url.startsWith('http')
  );
}

/**
 * Returns a configured Supabase client for server-side queries, or null if unconfigured.
 */
export function getSupabaseServerClient() {
  if (!isSupabaseConfiguredServer()) return null;

  if (!serverSupabaseClient) {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim();
    const key = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY
    ).trim();

    try {
      serverSupabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('[SUPABASE SERVER CLIENT ERROR]:', err.message);
      return null;
    }
  }

  return serverSupabaseClient;
}
