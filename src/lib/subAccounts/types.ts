/**
 * Sub-account (CMO/CWO) row types (PRD §4.5, §6.3). These mirror the Postgres
 * schema from the Sprint 6 migration (`20260630160000__sub_accounts.sql`).
 * Dates are ISO strings as returned by PostgREST; money fields are numbers.
 */

export type SubAccountTxnDirection = 'income' | 'expense';

export const SUB_ACCOUNT_DIRECTIONS: readonly SubAccountTxnDirection[] = ['income', 'expense'];

export type SubAccountReportStatus = 'submitted' | 'acknowledged';

export interface SubAccountRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubAccountTransactionRow {
  id: string;
  sub_account_id: string;
  direction: SubAccountTxnDirection;
  category_id: string | null;
  payee: string | null;
  description: string | null;
  amount: number;
  txn_date: string;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the income/expense form owns (actors are trigger-set server-side). */
export interface SubAccountTransactionInput {
  sub_account_id: string;
  direction: SubAccountTxnDirection;
  category_id: string | null;
  payee: string | null;
  description: string | null;
  amount: number;
  txn_date: string;
}

export interface SubAccountReportRow {
  id: string;
  sub_account_id: string;
  period_year: number;
  period_month: number;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  status: SubAccountReportStatus;
  submitted_by: string | null;
  submitted_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface ListSubAccountTransactionsFilters {
  direction?: SubAccountTxnDirection | null;
  categoryId?: string | null;
  /** When true (default) only active (non-archived) rows are returned. */
  activeOnly?: boolean;
}
