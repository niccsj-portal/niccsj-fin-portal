import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal fake of the Supabase client surface the app touches, for unit tests.
 * Only the methods exercised by AuthContext / pages are implemented; override
 * any of them per test. Returned as `SupabaseClient` via a cast so tests read
 * cleanly without pulling the full generated types.
 */
export interface FakeClientOptions {
  session?: unknown;
  role?: string | null;
  signInError?: boolean;
  rpcEmail?: string | null;
  rpcError?: boolean;
  resetError?: boolean;
  updateError?: boolean;
}

export function makeFakeSupabase(options: FakeClientOptions = {}) {
  const {
    session = null,
    role = 'member',
    signInError = false,
    rpcEmail = 'resolved@example.com',
    rpcError = false,
    resetError = false,
    updateError = false,
  } = options;

  // A mutable session so a successful sign-in flips `getSession()` to an
  // authenticated state — mirrors the real client and lets AuthContext.signIn
  // apply the session synchronously (drives `status` → authenticated in tests).
  type FakeSession = { user: { id: string } };
  let activeSession: FakeSession | null = (session as FakeSession | null) ?? null;

  const signInWithPassword = vi.fn(async () => {
    if (signInError) return { data: { session: null, user: null }, error: { message: 'invalid' } };
    activeSession = (session as FakeSession | null) ?? { user: { id: 'u-test' } };
    return { data: { session: activeSession, user: activeSession.user }, error: null };
  });
  const resetPasswordForEmail = vi.fn(async () => ({
    error: resetError ? { message: 'failed' } : null,
  }));
  const updateUser = vi.fn(async () => ({ error: updateError ? { message: 'failed' } : null }));
  const signOut = vi.fn(async () => ({ error: null }));
  const rpc = vi.fn(async () => ({
    data: rpcError ? null : rpcEmail,
    error: rpcError ? { message: 'rpc failed' } : null,
  }));

  const single = vi.fn(async () => ({
    data: role === null ? null : { role },
    error: null,
  }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single })),
    })),
  }));

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: activeSession } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword,
      resetPasswordForEmail,
      updateUser,
      signOut,
    },
    from,
    rpc,
  };

  return {
    client: client as unknown as SupabaseClient,
    spies: { signInWithPassword, resetPasswordForEmail, updateUser, signOut, rpc, from },
  };
}
