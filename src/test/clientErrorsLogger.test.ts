import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildClientErrorPayload,
  logClientError,
  MAX_STACK_LENGTH,
} from '@/lib/clientErrorsLogger';

describe('buildClientErrorPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:34:56.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('extracts message, stack, and component stack from an Error', () => {
    const error = new Error('boom');
    error.stack = 'Error: boom\n    at thrower (file.ts:1:1)';

    const payload = buildClientErrorPayload(error, {
      componentStack: '\n    in Thrower\n    in ErrorBoundary',
      path: '/admin/users',
      userAgent: 'test-agent/1.0',
    });

    expect(payload).toEqual({
      path: '/admin/users',
      message: 'boom',
      stack: expect.stringContaining('thrower (file.ts:1:1)'),
      user_agent: 'test-agent/1.0',
      occurred_at: '2025-01-15T12:34:56.000Z',
    });
    expect(payload.stack).toContain('in ErrorBoundary');
  });

  it('falls back to window/navigator/now when options are omitted', () => {
    const error = new Error('plain');
    const payload = buildClientErrorPayload(error);

    expect(payload.path).toBe(window.location.pathname);
    expect(payload.user_agent).toBe(navigator.userAgent);
    expect(payload.occurred_at).toBe('2025-01-15T12:34:56.000Z');
  });

  it('truncates very long stacks to MAX_STACK_LENGTH', () => {
    const error = new Error('long');
    error.stack = 'x'.repeat(MAX_STACK_LENGTH * 2);

    const payload = buildClientErrorPayload(error);

    expect(payload.stack).not.toBeNull();
    expect(payload.stack!.length).toBe(MAX_STACK_LENGTH);
  });

  it('handles non-Error throwables (strings)', () => {
    const payload = buildClientErrorPayload('something blew up');
    expect(payload.message).toBe('something blew up');
    expect(payload.stack).toBeNull();
  });

  it('handles null/undefined throwables without crashing', () => {
    const payload = buildClientErrorPayload(undefined);
    expect(payload.message).toBe('undefined');
    expect(payload.stack).toBeNull();
  });
});

describe('logClientError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mirrors the payload to console.error', async () => {
    const payload = buildClientErrorPayload(new Error('mirror'));
    await logClientError(payload, null);
    expect(console.error).toHaveBeenCalledWith('[client_errors]', payload);
  });

  it('is a no-op (besides console mirror) when the supabase client is null', async () => {
    const payload = buildClientErrorPayload(new Error('no client'));
    await expect(logClientError(payload, null)).resolves.toBeUndefined();
  });

  it('inserts into client_errors when a client is provided', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { from } as unknown as SupabaseClient;
    const payload = buildClientErrorPayload(new Error('insert me'));

    await logClientError(payload, client);

    expect(from).toHaveBeenCalledWith('client_errors');
    expect(insert).toHaveBeenCalledWith(payload);
  });

  it('swallows insert failures so logging never throws', async () => {
    const insert = vi.fn().mockRejectedValue(new Error('table missing'));
    const from = vi.fn().mockReturnValue({ insert });
    const client = { from } as unknown as SupabaseClient;
    const payload = buildClientErrorPayload(new Error('swallow'));

    await expect(logClientError(payload, client)).resolves.toBeUndefined();
  });
});
