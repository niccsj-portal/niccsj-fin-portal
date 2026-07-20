import type { SupabaseClient } from '@supabase/supabase-js';

import type { CategoryTotal } from '@/lib/contributions/search';
import type { Participation } from '@/lib/reports/types';
import type { SubAccountReportRow } from '@/lib/subAccounts/types';

/**
 * Reporting data access (Sprint 7; PRD §4.6). The dashboards otherwise reuse the
 * existing contributions / expenses / members data layers. Two kinds of new
 * access live here:
 *   - an unscoped read of the monthly sub-account snapshots for the Council
 *     rollups (story 7.5); RLS scopes it (overseer → all, Group FS → own);
 *   - the aggregate-only reporting RPCs (migration 20260630170000) that let the
 *     Finance Council — which is NOT a per-row contribution reader — obtain
 *     income / participation / category totals without any per-member row
 *     leaving the database (story 7.2, PRD §7). The RPCs self-gate to the
 *     leadership set, so these wrappers never widen what the server permits.
 */

function unwrapRows<T>(result: {
  data: T[] | null;
  error: { message: string } | null;
}): T[] {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

/**
 * Every `sub_account_reports` snapshot the caller may read, newest period first.
 * No `sub_account_id` filter is applied, so RLS decides the visible set.
 */
export async function listAllSubAccountReports(
  client: SupabaseClient,
): Promise<SubAccountReportRow[]> {
  const { data, error } = await client
    .from('sub_account_reports')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubAccountReportRow[];
}

interface IncomeByCategoryRpcRow {
  category_id: string;
  category_name: string;
  total: number;
}

/**
 * Per-category income totals for a date range (aggregate-only RPC). Shaped into
 * the same `CategoryTotal` the ledger roll-up uses so the Council dashboard can
 * feed `CategoryBarChart` directly.
 */
export async function reportIncomeByCategory(
  client: SupabaseClient,
  start: string,
  end: string,
): Promise<CategoryTotal[]> {
  const rows = unwrapRows<IncomeByCategoryRpcRow>(
    await client.rpc('report_income_by_category', { p_start: start, p_end: end }),
  );
  return rows.map((r) => ({
    categoryId: r.category_id,
    name: r.category_name,
    total: Number(r.total),
  }));
}

interface IncomeMonthlyRpcRow {
  month: number;
  total: number;
}

/** Income per month (1–12) for a calendar year (aggregate-only RPC). */
export async function reportIncomeMonthly(
  client: SupabaseClient,
  year: number,
): Promise<Map<number, number>> {
  const rows = unwrapRows<IncomeMonthlyRpcRow>(
    await client.rpc('report_income_monthly', { p_year: year }),
  );
  return new Map(rows.map((r) => [Number(r.month), Number(r.total)]));
}

/**
 * Household participation for a date range (aggregate-only RPC): distinct
 * contributing households over the total. Falls back to zeroes if the RPC
 * returns nothing (e.g. the caller is outside the leadership set).
 */
export async function reportParticipation(
  client: SupabaseClient,
  start: string,
  end: string,
): Promise<Participation> {
  const rows = unwrapRows<{ contributing: number; total: number }>(
    await client.rpc('report_participation', { p_start: start, p_end: end }),
  );
  const first = rows[0];
  const contributing = Number(first?.contributing ?? 0);
  const total = Number(first?.total ?? 0);
  return { contributing, total, rate: total > 0 ? contributing / total : 0 };
}
