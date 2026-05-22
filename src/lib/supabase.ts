/**
 * Supabase Client for Frontend
 * Used for OAuth authentication flows.
 *
 * The client is constructed lazily on first use. Constructing it at module
 * eval time calls `createClient()`, which throws "supabaseUrl is required"
 * when NEXT_PUBLIC_SUPABASE_URL is absent — that breaks `next build` static
 * prerendering for any page that transitively imports this module on a
 * deployment where the env var isn't set (e.g. non-`develop` Vercel preview
 * builds). Deferring construction keeps imports side-effect-free; the client
 * is only built when a property is actually accessed, which happens at
 * runtime where the env vars exist.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Surface the misconfiguration only when the client is actually used,
    // not merely imported — so build-time prerendering stays unaffected.
    throw new Error('Supabase environment variables not configured');
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

/**
 * Lazy proxy: behaves exactly like a SupabaseClient at every call site
 * (`supabase.auth.*`, `supabase.from(...)`, `supabase.storage.*`), but the
 * underlying client isn't constructed until the first property access.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
