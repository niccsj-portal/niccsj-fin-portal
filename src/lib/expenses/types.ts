/**
 * Expense + notification row types (PRD §4.4, §6.3 data model). These mirror
 * the Postgres schema from the Sprint 5 migration
 * (`20260630140000__expenses_and_notifications.sql`). Dates are ISO strings as
 * returned by PostgREST; `amount` is a number.
 */

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export const EXPENSE_STATUSES: readonly ExpenseStatus[] = ['pending', 'approved', 'rejected'];

export interface ExpenseRow {
  id: string;
  category_id: string;
  payee: string;
  description: string | null;
  expense_date: string;
  amount: number;
  status: ExpenseStatus;
  receipt_path: string | null;
  rejection_reason: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  decided_at: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the Treasurer's Add Expense form owns (actors are trigger-set). */
export interface ExpenseInput {
  category_id: string;
  payee: string;
  description: string | null;
  expense_date: string;
  amount: number;
  receipt_path: string | null;
}

export interface ExpenseNotificationRow {
  id: string;
  expense_id: string;
  notified_user_id: string;
  is_read: boolean;
  notified_at: string;
}

export interface ListExpensesFilters {
  status?: ExpenseStatus | null;
  categoryId?: string | null;
  /** When true (default) only active (non-archived) rows are returned. */
  activeOnly?: boolean;
}
