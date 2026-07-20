import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SIGNATURE_MAX_BYTES,
  signatureObjectPath,
  validateSignatureFile,
} from '@/lib/signatures/storage';
import {
  getMySignaturePath,
  removeSignature,
  uploadSignature,
} from '@/lib/signatures/storage';
import { makeAppClient } from './helpers/fakeDb';

function pngFile(size = 1000, type = 'image/png'): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], 'sig.png', { type });
}

describe('signature storage helpers (story 8.2)', () => {
  it('scopes the object path under the user id', () => {
    expect(signatureObjectPath('u1')).toBe('u1/signature.png');
  });

  it('rejects non-PNG and oversized files', () => {
    expect(validateSignatureFile(pngFile(1000, 'image/jpeg'))?.code).toBe('type');
    expect(validateSignatureFile(pngFile(SIGNATURE_MAX_BYTES + 1))?.code).toBe('size');
    expect(validateSignatureFile(pngFile(500))).toBeNull();
  });

  it('uploads then links the path on the user row', async () => {
    const { client, uploadFn, calls } = makeAppClient({ role: 'fin_secretary' });
    const path = await uploadSignature(client as SupabaseClient, 'u1', pngFile());
    expect(path).toBe('u1/signature.png');
    expect(uploadFn).toHaveBeenCalled();
    expect(calls.updated).toEqual({ fin_sec_signature_path: 'u1/signature.png' });
    expect(calls.filters).toContainEqual(['id', 'u1']);
  });

  it('clears the pointer then deletes the object on remove', async () => {
    const { client, removeFn, calls } = makeAppClient({ role: 'fin_secretary' });
    await removeSignature(client as SupabaseClient, 'u1', 'u1/signature.png');
    expect(calls.updated).toEqual({ fin_sec_signature_path: null });
    expect(removeFn).toHaveBeenCalledWith(['u1/signature.png']);
  });

  it('reads the current signature path', async () => {
    const { client } = makeAppClient({
      role: 'fin_secretary',
      tables: { users: { single: { fin_sec_signature_path: 'u1/signature.png' } } },
    });
    expect(await getMySignaturePath(client as SupabaseClient, 'u1')).toBe('u1/signature.png');
  });
});
