import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 8 story 8.3 — file-level guards for the generate-annual-summary Edge
 * Function. It runs under Deno in Supabase, so it can't execute in Vitest;
 * instead we assert the committed source enforces the security + gate rules.
 * Runtime rendering is exercised manually on deploy and by `deno check`.
 */
const functionsDir = path.resolve(__dirname, '../../supabase/functions');
const src = readFileSync(path.join(functionsDir, 'generate-annual-summary', 'index.ts'), 'utf8');

describe('generate-annual-summary (story 8.3)', () => {
  it('verifies the caller JWT', () => {
    expect(src).toMatch(/resolveCaller\(req\)/);
    expect(src).toMatch(/return errorResponse\('Unauthorized', 401\)/);
  });

  it('re-validates input with a zod schema', () => {
    expect(src).toMatch(/inputSchema\.safeParse/);
    expect(src).toMatch(/household_id: z\.string\(\)\.uuid\(\)/);
  });

  it('lets a non-privileged caller generate only their own family', () => {
    expect(src).toMatch(/PRIVILEGED_ROLES/);
    expect(src).toMatch(/member\.household_id !== household_id/);
    expect(src).toMatch(/only generate your own family summary/i);
  });

  it('blocks issuance with 409 FS_SIGNATURE_REQUIRED when no signature on file', () => {
    expect(src).toMatch(/role', 'fin_secretary'/);
    expect(src).toMatch(/error: 'FS_SIGNATURE_REQUIRED'/);
    expect(src).toMatch(/\},\s*409\)/);
  });

  it('computes totals server-side and renders with pdf-lib', () => {
    expect(src).toMatch(/from\('contributions'\)/);
    expect(src).toMatch(/PDFDocument\.create\(\)/);
    expect(src).toMatch(/pdf-lib/);
  });

  it('reads the signature bytes with the service role and returns base64 PDF', () => {
    expect(src).toMatch(/storage\s*\.from\('signatures'\)\s*\.download/);
    expect(src).toMatch(/encodeBase64\(pdfBytes\)/);
    expect(src).toMatch(/contentType: 'application\/pdf'/);
  });
});
