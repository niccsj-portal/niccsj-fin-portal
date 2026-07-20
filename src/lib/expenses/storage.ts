import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Receipt storage helper (PRD §4.4, technology.md §9). Receipts live in a
 * PRIVATE Supabase Storage bucket and are only ever served through a
 * short-lived signed URL — never a public URL. The bucket itself is created in
 * the cloud project (story 5.2); these helpers are the thin client surface the
 * expense pages use.
 */

export const RECEIPTS_BUCKET = 'receipts';

/** Default signed-URL lifetime: 5 minutes (short-lived, PRD §4.4). */
export const SIGNED_URL_TTL_SECONDS = 300;

/** Allowed receipt file types — images + PDF (UX §5.3). */
export const RECEIPT_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';

/** Max receipt size: 5 MB. */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Build a stable, collision-resistant object path for a receipt. Files are
 * namespaced by year so the bucket stays browsable, and use a random suffix so
 * two uploads of the same file name never clash.
 */
export function receiptObjectPath(fileName: string, now: Date = new Date()): string {
  const year = now.getFullYear();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const rand = Math.random().toString(36).slice(2, 10);
  return `${year}/${now.getTime()}-${rand}-${safe}`;
}

/**
 * Upload a receipt to the private bucket and return its storage path. The path
 * (not a URL) is what gets stored on the expense row; a signed URL is minted on
 * demand when someone views the receipt.
 */
export async function uploadReceipt(
  client: SupabaseClient,
  file: File,
): Promise<string> {
  if (file.size > RECEIPT_MAX_BYTES) {
    throw new Error('Receipt is larger than the 5 MB limit.');
  }
  const path = receiptObjectPath(file.name);
  const { error } = await client.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Mint a short-lived signed URL for a stored receipt path. Returns `null` when
 * the expense has no receipt so callers can branch without a try/catch.
 */
export async function getReceiptSignedUrl(
  client: SupabaseClient,
  path: string | null,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}
