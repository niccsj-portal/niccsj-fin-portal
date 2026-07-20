import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ExpenseInput,
  ExpenseNotificationRow,
  ExpenseRow,
  ListExpensesFilters,
} from '@/lib/expenses/types';

/**
 * Expense + notification data access (PRD §4.4). Reads are thin PostgREST
 * wrappers; the state-changing flows (submit / approve / reject) go through
 * server-side Edge Functions (PRD §6.4) because they must validate the caller's
 * role, fan out notifications, and write audit entries atomically — none of
 * which can be trusted to the SPA.
 *
 * Row Level Security (Sprint 5 migration) is the real authorization boundary:
 *   - the "notified" set (FS/Treasurer/Chaplain/Finance Council/Admin) reads;
 *   - only recorders (Treasurer/Admin) insert/edit pending rows;
 *   - only approvers (Chaplain/Admin) flip status.
 */

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** Expenses, newest first. Equality filters narrow server-side. */
export async function listExpenses(
  client: SupabaseClient,
  filters: ListExpensesFilters = {},
): Promise<ExpenseRow[]> {
  const { activeOnly = true } = filters;
  let query = client.from('expenses').select('*');
  if (activeOnly) query = query.eq('is_active', true);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  const { data, error } = await query.order('expense_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseRow[];
}

export async function getExpense(client: SupabaseClient, id: string): Promise<ExpenseRow> {
  return unwrap<ExpenseRow>(await client.from('expenses').select('*').eq('id', id).single());
}

function invokeOrThrow<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/**
 * Submit a new expense (story 5.3). Runs the `submit-expense` Edge Function,
 * which creates the pending row and fans out notifications to the Finance
 * Council + Chaplain. Returns the created expense.
 */
export async function submitExpense(
  client: SupabaseClient,
  input: ExpenseInput,
): Promise<ExpenseRow> {
  return invokeOrThrow<ExpenseRow>(
    await client.functions.invoke('submit-expense', { body: input }),
  );
}

/** Approve a pending expense (story 5.4). Approver-only; audited server-side. */
export async function approveExpense(
  client: SupabaseClient,
  expenseId: string,
): Promise<ExpenseRow> {
  return invokeOrThrow<ExpenseRow>(
    await client.functions.invoke('approve-expense', { body: { expense_id: expenseId } }),
  );
}

/**
 * Reject a pending expense with a mandatory reason (story 5.4). Approver-only;
 * audited server-side.
 */
export async function rejectExpense(
  client: SupabaseClient,
  expenseId: string,
  reason: string,
): Promise<ExpenseRow> {
  return invokeOrThrow<ExpenseRow>(
    await client.functions.invoke('reject-expense', {
      body: { expense_id: expenseId, reason },
    }),
  );
}

/** The current user's expense notifications, newest first (story 5.7). */
export async function listNotifications(
  client: SupabaseClient,
  opts: { unreadOnly?: boolean } = {},
): Promise<ExpenseNotificationRow[]> {
  let query = client.from('expense_notifications').select('*');
  if (opts.unreadOnly) query = query.eq('is_read', false);
  const { data, error } = await query.order('notified_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseNotificationRow[];
}

/** Mark one of the current user's notifications read (story 5.7). */
export async function markNotificationRead(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('expense_notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
