/**
 * Types for the End-of-Year Family Contribution Summary (Sprint 8).
 *
 * The authoritative figures are computed server-side by the
 * `generate-annual-summary` Edge Function (never trust the client). These
 * types describe the request, the optional client-side preview totals, and the
 * function's response envelope.
 *
 * References: PRD §4.6 (annual summary), §4.10 (signature gate), graphics.md §11.
 */

export interface AnnualSummaryRequest {
  householdId: string;
  year: number;
}

/** One category's rolled-up total for a family-year (preview + PDF breakdown). */
export interface SummaryCategoryTotal {
  categoryId: string;
  name: string;
  total: number;
}

/** Client-side preview of a family-year (display only; not the source of truth). */
export interface FamilyYearPreview {
  householdName: string;
  year: number;
  categories: SummaryCategoryTotal[];
  grandTotal: number;
  contributionCount: number;
}

/** Success envelope returned by the Edge Function (base64 PDF payload). */
export interface AnnualSummarySuccess {
  filename: string;
  contentType: 'application/pdf';
  dataBase64: string;
}

/** Structured error code the UI keys off for the "blocked" message (story 8.5). */
export const FS_SIGNATURE_REQUIRED = 'FS_SIGNATURE_REQUIRED' as const;

export interface AnnualSummaryError {
  error: string;
  message?: string;
}
