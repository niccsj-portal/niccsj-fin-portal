import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from './supabase';

/**
 * Shape of a row in `client_errors` (PRD §4.11, §6.3).
 *
 * The table itself — and its `id` / `user_id` columns plus RLS policy
 * (insert by any authenticated user, read by admins only) — lands in
 * Sprint 1 (backlog stories 1.1 + 1.10). Until then the insert call
 * below silently no-ops on the server, but the boundary still surfaces
 * the same payload via `console.error` so developers can see what would
 * have been written.
 */
export interface ClientErrorPayload {
  path: string;
  message: string;
  stack: string | null;
  user_agent: string;
  occurred_at: string; // ISO-8601
}

/** Hard cap on stored stacks to keep `client_errors` rows bounded. */
export const MAX_STACK_LENGTH = 4000;

/**
 * Build a `ClientErrorPayload` from a caught error + optional React
 * component stack, suitable for direct insertion into `client_errors`.
 */
export function buildClientErrorPayload(
  error: unknown,
  options: { componentStack?: string | null; path?: string; userAgent?: string } = {},
): ClientErrorPayload {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);

  const rawStack =
    (error instanceof Error && error.stack ? error.stack : '') +
    (options.componentStack ? `\n${options.componentStack}` : '');

  const stack = rawStack ? rawStack.slice(0, MAX_STACK_LENGTH) : null;

  return {
    path: options.path ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    message: message || 'Unknown error',
    stack,
    user_agent:
      options.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    occurred_at: new Date().toISOString(),
  };
}

/**
 * Best-effort write to `client_errors`. Failures (missing table, network
 * issues, missing Supabase config) are intentionally swallowed so a logging
 * failure never compounds the user-visible error; the payload is always
 * mirrored to `console.error` for local visibility.
 *
 * The `client` parameter is injectable so tests can supply a stub without
 * touching the singleton or the env.
 */
export async function logClientError(
  payload: ClientErrorPayload,
  client: SupabaseClient | null = getSupabaseClient(),
): Promise<void> {
  // Always log locally so the failure is visible during development even
  // before the dev Supabase project / `client_errors` table exists.
  console.error('[client_errors]', payload);

  if (!client) return;

  try {
    await client.from('client_errors').insert(payload);
  } catch {
    // Swallow — see function docs.
  }
}
