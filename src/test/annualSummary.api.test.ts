import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SignatureRequiredError,
  base64ToBlob,
  generateAnnualSummary,
} from '@/lib/annualSummary/api';

function clientWith(invoke: () => Promise<{ data: unknown; error: unknown }>): SupabaseClient {
  return { functions: { invoke: vi.fn(invoke) } } as unknown as SupabaseClient;
}

describe('annual summary client api (stories 8.4/8.5)', () => {
  it('decodes a base64 payload into a typed Blob', () => {
    const blob = base64ToBlob(btoa('PDFDATA'), 'application/pdf');
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe('PDFDATA'.length);
  });

  it('returns filename + blob on success', async () => {
    const client = clientWith(async () => ({
      data: { filename: 'summary.pdf', contentType: 'application/pdf', dataBase64: btoa('PDF') },
      error: null,
    }));
    const result = await generateAnnualSummary(client, { householdId: 'h1', year: 2026 });
    expect(result.filename).toBe('summary.pdf');
    expect(result.blob.type).toBe('application/pdf');
  });

  it('maps a 409 FS_SIGNATURE_REQUIRED into SignatureRequiredError', async () => {
    const client = clientWith(async () => ({
      data: null,
      error: {
        message: 'HTTP 409',
        context: { json: async () => ({ error: 'FS_SIGNATURE_REQUIRED', message: 'Signature required.' }) },
      },
    }));
    await expect(
      generateAnnualSummary(client, { householdId: 'h1', year: 2026 }),
    ).rejects.toBeInstanceOf(SignatureRequiredError);
  });

  it('surfaces other errors as plain Error', async () => {
    const client = clientWith(async () => ({
      data: null,
      error: {
        message: 'boom',
        context: { json: async () => ({ error: 'SERVER', message: 'Server error.' }) },
      },
    }));
    await expect(
      generateAnnualSummary(client, { householdId: 'h1', year: 2026 }),
    ).rejects.toThrow('Server error.');
  });
});
