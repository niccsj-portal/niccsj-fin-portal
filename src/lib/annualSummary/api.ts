import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FS_SIGNATURE_REQUIRED,
  type AnnualSummaryRequest,
  type AnnualSummarySuccess,
} from './types';
import { FS_SIGNATURE_REQUIRED_MESSAGE } from './summary';

/**
 * Client wrapper for the `generate-annual-summary` Edge Function (Sprint 8.4).
 *
 * The function returns a base64-encoded PDF on success (200) or a structured
 * JSON error on failure — most importantly a 409 with `error:
 * 'FS_SIGNATURE_REQUIRED'` when no Financial Secretary signature is on file,
 * which the UI turns into the friendly blocked message (story 8.5).
 *
 * References: PRD §4.6, §4.10, §7.
 */

/** Thrown when generation is blocked because no FS signature is on file. */
export class SignatureRequiredError extends Error {
  readonly code = FS_SIGNATURE_REQUIRED;
  constructor(message = FS_SIGNATURE_REQUIRED_MESSAGE) {
    super(message);
    this.name = 'SignatureRequiredError';
  }
}

/** Decode a base64 payload into a typed Blob (browser + jsdom safe). */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

/** Best-effort read of a Supabase FunctionsHttpError JSON body. */
async function readInvokeErrorBody(
  error: unknown,
): Promise<{ error?: string; message?: string } | null> {
  const context = (error as { context?: unknown })?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      return (await (context as Response).json()) as { error?: string; message?: string };
    } catch {
      return null;
    }
  }
  return null;
}

export interface GeneratedSummary {
  filename: string;
  blob: Blob;
}

/**
 * Generate (and return for download) the End-of-Year summary PDF for a
 * household + year. Throws {@link SignatureRequiredError} when blocked, or a
 * plain Error for any other failure.
 */
export async function generateAnnualSummary(
  client: SupabaseClient,
  { householdId, year }: AnnualSummaryRequest,
): Promise<GeneratedSummary> {
  const { data, error } = await client.functions.invoke('generate-annual-summary', {
    body: { household_id: householdId, year },
  });

  if (error) {
    const body = await readInvokeErrorBody(error);
    if (body?.error === FS_SIGNATURE_REQUIRED) {
      throw new SignatureRequiredError(body.message);
    }
    throw new Error(body?.message ?? body?.error ?? error.message);
  }

  const payload = data as AnnualSummarySuccess;
  if (!payload?.dataBase64 || !payload.filename) {
    throw new Error('The annual summary response was malformed.');
  }
  return {
    filename: payload.filename,
    blob: base64ToBlob(payload.dataBase64, 'application/pdf'),
  };
}

/** Trigger a browser download for a generated PDF blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
