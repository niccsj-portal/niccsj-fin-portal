import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  RECEIPT_MAX_BYTES,
  RECEIPTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  getReceiptSignedUrl,
  receiptObjectPath,
  uploadReceipt,
} from '@/lib/expenses/storage';

/** A fake Storage surface with upload + createSignedUrl spies. */
function makeStorageClient(opts: {
  uploadError?: { message: string } | null;
  signedUrl?: string | null;
  signError?: { message: string } | null;
} = {}) {
  const upload = vi.fn(async () => ({
    data: { path: 'p' },
    error: opts.uploadError ?? null,
  }));
  const createSignedUrl = vi.fn(async () => ({
    data: opts.signedUrl === undefined ? { signedUrl: 'https://signed/url' } : { signedUrl: opts.signedUrl },
    error: opts.signError ?? null,
  }));
  const fromBucket = vi.fn(() => ({ upload, createSignedUrl }));
  const client = { storage: { from: fromBucket } } as unknown as SupabaseClient;
  return { client, upload, createSignedUrl, fromBucket };
}

function fileOf(name: string, size: number): File {
  const f = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('receiptObjectPath', () => {
  it('namespaces by year, keeps a safe name and is collision-resistant', () => {
    const now = new Date('2026-06-30T12:00:00Z');
    const p1 = receiptObjectPath('My Receipt #1.pdf', now);
    const p2 = receiptObjectPath('My Receipt #1.pdf', now);
    expect(p1.startsWith('2026/')).toBe(true);
    expect(p1).toContain('My_Receipt__1.pdf');
    expect(p1).not.toEqual(p2); // random suffix differs
  });
});

describe('uploadReceipt (story 5.2)', () => {
  it('uploads to the private receipts bucket and returns the stored path', async () => {
    const { client, fromBucket, upload } = makeStorageClient();
    const path = await uploadReceipt(client, fileOf('r.pdf', 1000));
    expect(fromBucket).toHaveBeenCalledWith(RECEIPTS_BUCKET);
    expect(upload).toHaveBeenCalled();
    expect(path).toContain('r.pdf');
  });

  it('rejects a file over the size limit', async () => {
    const { client, upload } = makeStorageClient();
    await expect(uploadReceipt(client, fileOf('big.pdf', RECEIPT_MAX_BYTES + 1))).rejects.toThrow(
      /5 MB/,
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it('throws on an upload error', async () => {
    const { client } = makeStorageClient({ uploadError: { message: 'denied' } });
    await expect(uploadReceipt(client, fileOf('r.pdf', 100))).rejects.toThrow('denied');
  });
});

describe('getReceiptSignedUrl (story 5.2)', () => {
  it('mints a short-lived signed URL for a stored path', async () => {
    const { client, createSignedUrl } = makeStorageClient({ signedUrl: 'https://signed/abc' });
    const url = await getReceiptSignedUrl(client, 'receipts/2026/abc.pdf');
    expect(createSignedUrl).toHaveBeenCalledWith('receipts/2026/abc.pdf', SIGNED_URL_TTL_SECONDS);
    expect(url).toBe('https://signed/abc');
  });

  it('returns null when there is no receipt path (no try/catch needed)', async () => {
    const { client, createSignedUrl } = makeStorageClient();
    expect(await getReceiptSignedUrl(client, null)).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('throws when signing fails', async () => {
    const { client } = makeStorageClient({ signError: { message: 'no object' } });
    await expect(getReceiptSignedUrl(client, 'x')).rejects.toThrow('no object');
  });
});
