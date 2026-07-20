import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Storage helpers for the Financial Secretary signature image (Sprint 8.2).
 *
 * The `signatures` bucket is PRIVATE (migration 20260703170000). Object-level
 * RLS scopes every file to `<user_id>/…` so an FS only ever touches their own
 * signature; Admin may reach any for recovery. The SPA uploads the PNG, stores
 * the path on `public.users.fin_sec_signature_path`, and mints short-lived
 * signed URLs for preview only. The `generate-annual-summary` Edge Function
 * reads the bytes server-side with the service role at render time.
 *
 * References: PRD §4.10 (signature management), §6.3 (private storage + signed
 * URLs), graphics.md §11 (signature block).
 */
export const SIGNATURES_BUCKET = 'signatures';

/** Preview signed URLs are intentionally short-lived. */
export const SIGNATURE_SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/** Only a transparent PNG is accepted for the signature (graphics.md §11). */
export const SIGNATURE_ACCEPT = 'image/png';

/** Signatures are tiny (~180×60). Cap uploads well under a megabyte. */
export const SIGNATURE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Stable per-user object path. Using a single fixed name means a replace simply
 * overwrites (upsert) the previous signature rather than orphaning files.
 */
export function signatureObjectPath(userId: string): string {
  return `${userId}/signature.png`;
}

export interface SignatureValidationError {
  code: 'type' | 'size';
  message: string;
}

/** Client-side guard mirrored by the storage RLS + Edge Function re-checks. */
export function validateSignatureFile(file: File): SignatureValidationError | null {
  if (file.type !== SIGNATURE_ACCEPT) {
    return { code: 'type', message: 'The signature must be a transparent PNG image.' };
  }
  if (file.size > SIGNATURE_MAX_BYTES) {
    return { code: 'size', message: 'The signature image must be 1 MB or smaller.' };
  }
  return null;
}

/**
 * Upload (or replace) the caller's signature PNG and point their user row at it.
 * Returns the stored object path. Throws on validation or storage failure.
 */
export async function uploadSignature(
  client: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  const invalid = validateSignatureFile(file);
  if (invalid) throw new Error(invalid.message);

  const path = signatureObjectPath(userId);
  const { error: uploadError } = await client.storage
    .from(SIGNATURES_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: SIGNATURE_ACCEPT });
  if (uploadError) throw new Error(uploadError.message);

  const { error: linkError } = await client
    .from('users')
    .update({ fin_sec_signature_path: path })
    .eq('id', userId);
  if (linkError) throw new Error(linkError.message);

  return path;
}

/**
 * Remove the caller's signature: clear the pointer first (so no dangling
 * reference remains if the object delete fails), then delete the object.
 */
export async function removeSignature(
  client: SupabaseClient,
  userId: string,
  path: string,
): Promise<void> {
  const { error: linkError } = await client
    .from('users')
    .update({ fin_sec_signature_path: null })
    .eq('id', userId);
  if (linkError) throw new Error(linkError.message);

  const { error: removeError } = await client.storage.from(SIGNATURES_BUCKET).remove([path]);
  if (removeError) throw new Error(removeError.message);
}

/** Mint a short-lived signed URL for previewing a stored signature. */
export async function getSignatureSignedUrl(
  client: SupabaseClient,
  path: string | null,
  ttlSeconds = SIGNATURE_SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage
    .from(SIGNATURES_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

/** Read the caller's current signature path (null when none on file). */
export async function getMySignaturePath(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('users')
    .select('fin_sec_signature_path')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return (data?.fin_sec_signature_path as string | null) ?? null;
}
