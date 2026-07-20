import type { SummaryCategoryTotal } from './types';

/**
 * Pure, framework-free helpers for the annual summary (Sprint 8). These are the
 * client-side preview + naming helpers and are unit-tested directly. The
 * `generate-annual-summary` Edge Function re-derives the authoritative totals
 * server-side (the client is never trusted for the issued PDF).
 *
 * References: PRD §4.6, graphics.md §11.
 */

export interface RawContribution {
  category_id: string;
  amount: number | string;
}

/**
 * Roll contributions up by category, newest-largest first. Amounts may arrive
 * as strings from PostgREST `numeric` columns, so coerce with Number().
 */
export function rollupByCategory(
  rows: RawContribution[],
  categoryName: (id: string) => string,
): SummaryCategoryTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const prev = totals.get(row.category_id) ?? 0;
    totals.set(row.category_id, prev + Number(row.amount));
  }
  return Array.from(totals.entries())
    .map(([categoryId, total]) => ({ categoryId, name: categoryName(categoryId), total }))
    .sort((a, b) => b.total - a.total);
}

/** Grand total across all category buckets. */
export function grandTotal(categories: SummaryCategoryTotal[]): number {
  return categories.reduce((sum, c) => sum + c.total, 0);
}

/** True when no signature is on file — generation must be blocked (PRD §4.6). */
export function isGenerationBlocked(signaturePath: string | null | undefined): boolean {
  return !signaturePath;
}

/**
 * Deterministic, filesystem-safe download name, e.g.
 * `NICC-SJ_Annual_Summary_2026_Okeke_Family.pdf`.
 */
export function annualSummaryFilename(householdName: string, year: number): string {
  const safe = (householdName || 'Family').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `NICC-SJ_Annual_Summary_${year}_${safe || 'Family'}.pdf`;
}

/** The canonical blocked-generation message (graphics.md §11 / story 8.5). */
export const FS_SIGNATURE_REQUIRED_MESSAGE =
  'Financial Secretary signature is required before annual summaries can be issued.';
