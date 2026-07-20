import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Chainable fake of the Supabase PostgREST query builder for data-layer unit
 * tests. A single shared builder is returned for every `from()` call so a test
 * can inspect what was inserted/updated/filtered after one operation.
 *
 * Supported terminals:
 *   - awaiting the chain (e.g. `.order(...)`, `.update().eq()`) resolves to
 *     `{ data: rows, error }`
 *   - `.single()` / `.maybeSingle()` resolve to `{ data: single, error }`
 */
export interface FakeDbConfig {
  rows?: unknown[];
  single?: unknown;
  error?: { message: string } | null;
  nextNumber?: number;
  rpcError?: boolean;
}

export interface FakeBuilderCalls {
  filters: Array<[string, unknown]>;
  inserted: unknown;
  updated: unknown;
  ordered: Array<[string, unknown]>;
}

export function makeMembersClient(config: FakeDbConfig = {}) {
  const calls: FakeBuilderCalls = { filters: [], inserted: null, updated: null, ordered: [] };
  const listResult = { data: config.rows ?? [], error: config.error ?? null };
  const singleResult = { data: config.single ?? null, error: config.error ?? null };

  const builder = {
    select: () => builder,
    insert: (payload: unknown) => {
      calls.inserted = payload;
      return builder;
    },
    update: (payload: unknown) => {
      calls.updated = payload;
      return builder;
    },
    delete: () => builder,
    eq: (col: string, val: unknown) => {
      calls.filters.push([col, val]);
      return builder;
    },
    order: (col: string, opts: unknown) => {
      calls.ordered.push([col, opts]);
      return Promise.resolve(listResult);
    },
    single: () => Promise.resolve(singleResult),
    maybeSingle: () => Promise.resolve(singleResult),
    then: (
      resolve: (v: typeof listResult) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(listResult).then(resolve, reject),
  };

  const rpc = vi.fn(async () => ({
    data: config.rpcError ? null : (config.nextNumber ?? 79),
    error: config.rpcError ? { message: 'rpc failed' } : null,
  }));
  const from = vi.fn(() => builder);
  const client = { from, rpc } as unknown as SupabaseClient;

  return { client, from, rpc, calls, builder };
}

interface FakeTable {
  rows?: unknown[];
  single?: unknown;
  error?: { message: string } | null;
  /** Result of a `head`/`count` select (e.g. Sprint 9 health page). */
  count?: number;
}

function makeTableBuilder(cfg: FakeTable, calls: FakeBuilderCalls) {
  const listResult = { data: cfg.rows ?? [], error: cfg.error ?? null };
  const singleResult = { data: cfg.single ?? null, error: cfg.error ?? null };
  const countResult = { data: null, count: cfg.count ?? 0, error: cfg.error ?? null };
  // A `select(cols, { head: true })` resolves to a count envelope instead of rows.
  let headSelect = false;
  const builder = {
    select: (_cols?: unknown, opts?: { head?: boolean; count?: string }) => {
      if (opts?.head || opts?.count) headSelect = true;
      return builder;
    },
    insert: (payload: unknown) => {
      calls.inserted = payload;
      return builder;
    },
    update: (payload: unknown) => {
      calls.updated = payload;
      return builder;
    },
    delete: () => builder,
    eq: (col: string, val: unknown) => {
      calls.filters.push([col, val]);
      return builder;
    },
    gte: (col: string, val: unknown) => {
      calls.filters.push([col, val]);
      return builder;
    },
    lte: (col: string, val: unknown) => {
      calls.filters.push([col, val]);
      return builder;
    },
    limit: () => builder,
    // Chainable + awaitable: supports both `await q.order(...)` (one sort) and
    // `q.order(...).order(...)` (a secondary sort), resolving via `then`.
    order: (col: string, opts: unknown) => {
      calls.ordered.push([col, opts]);
      return builder;
    },
    single: () => Promise.resolve(singleResult),
    maybeSingle: () => Promise.resolve(singleResult),
    then: (
      resolve: (v: typeof listResult | typeof countResult) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(headSelect ? countResult : listResult).then(resolve, reject),
  };
  return builder;
}

/**
 * Full app-level fake: includes `auth.*` (so AuthProvider can resolve a
 * session + role) AND a per-table PostgREST builder (so data pages render).
 * The `users` table is auto-wired to return the configured `role`.
 */
export function makeAppClient(
  config: {
    session?: unknown;
    role?: string | null;
    memberId?: string | null;
    tables?: Record<string, FakeTable>;
    nextNumber?: number;
    /** Result returned by every `functions.invoke(...)` call. */
    invokeResult?: { data?: unknown; error?: { message: string } | null };
    /** Signed URL returned by `storage.from().createSignedUrl()`. */
    signedUrl?: string | null;
    /** Per-RPC-name results for `client.rpc(name, args)` (Sprint 7 report RPCs). */
    rpcResults?: Record<string, unknown>;
  } = {},
) {
  const {
    session = { user: { id: 'u1' } },
    role = 'admin',
    memberId = null,
    tables = {},
    nextNumber = 79,
    invokeResult = { data: { id: 'fn-result' }, error: null },
    signedUrl = 'https://signed/url',
    rpcResults = {},
  } = config;

  const calls: FakeBuilderCalls = { filters: [], inserted: null, updated: null, ordered: [] };
  const allTables: Record<string, FakeTable> = {
    users: { single: role === null ? null : { role, member_id: memberId } },
    ...tables,
  };

  const auth = {
    getSession: vi.fn(async () => ({ data: { session } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  };

  const from = vi.fn((table: string) => makeTableBuilder(allTables[table] ?? {}, calls));
  const rpc = vi.fn(async (name: string) => ({
    data: name in rpcResults ? rpcResults[name] : nextNumber,
    error: null,
  }));
  const invoke = vi.fn(async () => ({
    data: invokeResult.data ?? null,
    error: invokeResult.error ?? null,
  }));
  const uploadFn = vi.fn(async () => ({ data: { path: 'p' }, error: null }));
  const createSignedUrlFn = vi.fn(async () => ({ data: { signedUrl }, error: null }));
  const removeFn = vi.fn(async () => ({ data: [{ name: 'p' }], error: null }));
  const downloadFn = vi.fn(async () => ({ data: new Blob(['png']), error: null }));
  const storage = {
    from: vi.fn(() => ({
      upload: uploadFn,
      createSignedUrl: createSignedUrlFn,
      remove: removeFn,
      download: downloadFn,
    })),
  };
  const client = {
    auth,
    from,
    rpc,
    functions: { invoke },
    storage,
  } as unknown as SupabaseClient;

  return {
    client,
    from,
    rpc,
    auth,
    calls,
    invoke,
    uploadFn,
    createSignedUrlFn,
    removeFn,
    downloadFn,
  };
}
