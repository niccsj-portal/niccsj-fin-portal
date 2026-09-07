import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ListSubAccountTransactionsFilters,
  SubAccountCategoryRow,
  SubAccountReportRow,
  SubAccountRow,
  SubAccountTransactionInput,
  SubAccountTransactionRow,
  SubAccountTransactionWithGroup,
} from '@/lib/subAccounts/types';

/**
 * Sub-account data access (PRD §4.5). Reads + the income/expense ledger write
 * are thin PostgREST wrappers — Row Level Security (Sprint 6 migration) is the
 * real authorization boundary, so a Group Financial Secretary only ever sees
 * and writes their assigned group:
 *   - `caller_sub_account_ids()` scopes every read + insert;
 *   - overseers (FS / Treasurer / Finance Council / Admin) read all rollups;
 *   - the monthly snapshot is written by the `submit-sub-account-report` Edge
 *     Function (service role) because it must be computed atomically (PRD §6.4).
 *
 * The SPA never trusts the role for access; it only narrows what the server
 * already permits.
 */

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/**
 * The sub-accounts the caller may reach, by name. For a Group FS this is their
 * assignment; for an overseer it is every active group (RLS decides).
 */
export async function listSubAccounts(client: SupabaseClient): Promise<SubAccountRow[]> {
  const { data, error } = await client
    .from('sub_accounts')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubAccountRow[];
}

/**
 * The category ids a group (sub-account) may record against (story 6.x). Scopes
 * the Group FS category picker to their own group's dues + donations (PRD §7).
 * RLS lets any authenticated caller read the mapping.
 */
export async function listSubAccountCategoryIds(
  client: SupabaseClient,
  subAccountId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('sub_account_categories')
    .select('category_id')
    .eq('sub_account_id', subAccountId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Pick<SubAccountCategoryRow, 'category_id'>[]).map((r) => r.category_id);
}

/**
 * The group dues attributed to the signed-in member (member-facing view). RLS
 * (`sub_account_transactions_select_own_member`) already limits rows to the
 * caller; the explicit member filter keeps the query intent clear. The parent
 * sub-account is embedded so the group name can be shown.
 */
export async function listMemberSubAccountDues(
  client: SupabaseClient,
  memberId: string,
): Promise<SubAccountTransactionWithGroup[]> {
  const { data, error } = await client
    .from('sub_account_transactions')
    .select('*, sub_accounts(name, slug)')
    .eq('member_id', memberId)
    .eq('is_active', true)
    .order('txn_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubAccountTransactionWithGroup[];
}

/** Transactions for one sub-account, newest first. Equality filters narrow server-side. */
export async function listSubAccountTransactions(
  client: SupabaseClient,
  subAccountId: string,
  filters: ListSubAccountTransactionsFilters = {},
): Promise<SubAccountTransactionRow[]> {
  const { activeOnly = true } = filters;
  let query = client
    .from('sub_account_transactions')
    .select('*')
    .eq('sub_account_id', subAccountId);
  if (activeOnly) query = query.eq('is_active', true);
  if (filters.direction) query = query.eq('direction', filters.direction);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  const { data, error } = await query.order('txn_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubAccountTransactionRow[];
}

/**
 * Record an income or expense entry on a group ledger (story 6.3). A plain
 * insert: RLS rejects any sub_account the caller is not assigned to, and the
 * BEFORE trigger stamps the actor. Returns the created row.
 */
export async function recordSubAccountTransaction(
  client: SupabaseClient,
  input: SubAccountTransactionInput,
): Promise<SubAccountTransactionRow> {
  return unwrap<SubAccountTransactionRow>(
    await client.from('sub_account_transactions').insert(input).select('*').single(),
  );
}

/** Archive (soft-delete) a transaction — never a hard delete (PRD §6.3). */
export async function archiveSubAccountTransaction(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('sub_account_transactions')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Monthly summary snapshots for one sub-account, newest period first (story 6.5). */
export async function listSubAccountReports(
  client: SupabaseClient,
  subAccountId: string,
): Promise<SubAccountReportRow[]> {
  const { data, error } = await client
    .from('sub_account_reports')
    .select('*')
    .eq('sub_account_id', subAccountId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubAccountReportRow[];
}

/**
 * Submit a monthly summary (story 6.4). Runs the `submit-sub-account-report`
 * Edge Function, which re-checks the caller's assignment, computes the
 * opening/income/expense/closing snapshot server-side, and writes the immutable
 * report row. Returns the created report.
 */
export async function submitSubAccountReport(
  client: SupabaseClient,
  input: { sub_account_id: string; period_year: number; period_month: number },
): Promise<SubAccountReportRow> {
  const { data, error } = await client.functions.invoke('submit-sub-account-report', {
    body: input,
  });
  if (error) throw new Error(error.message);
  return data as SubAccountReportRow;
}
