import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazily-constructed singleton Supabase client.
 *
 * The client is created on first call and reused thereafter. If the public
 * Supabase environment variables are missing (e.g., a fresh checkout where
 * `.env.local` has not been filled in yet, or a CI build before secrets are
 * configured), this function returns `null` rather than throwing. Callers
 * must handle the null case — see `src/lib/clientErrorsLogger.ts` for the
 * canonical pattern.
 *
 * Only the public anon key is consumed; Row Level Security is the actual
 * authorization boundary (see docs/PRD.md §6.2, docs/technology.md §9).
 */
let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, anonKey);
  return cached;
}

/** Test-only: clear the cached client so env stubbing takes effect. */
export function __resetSupabaseClientForTests(): void {
  cached = undefined;
}
