import { formatUSD } from '@/lib/contributions/search';
import type { CategoryRow } from '@/lib/contributions/types';
import type { ExpenseRow, ExpenseStatus } from '@/lib/expenses/types';

/**
 * Client-side filtering + aggregation over the (small) expenses set, plus the
 * status presentation tokens used by the Treasurer ledger (story 5.5) and the
 * Chaplain approval queue (story 5.6). Status is always shown by color + icon +
 * label, never color alone (PRD §6 graphics standard).
 */

export { formatUSD };

export interface ExpenseFilter {
  status?: ExpenseStatus | 'all';
  categoryId?: string;
  search?: string;
}

export interface ExpenseLookups {
  categoryName: (id: string) => string;
}

export function expenseYear(row: ExpenseRow): number {
  return Number(row.expense_date.slice(0, 4));
}

export function buildExpenseLookups(categories: CategoryRow[]): ExpenseLookups {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  return { categoryName: (id) => cat.get(id) ?? '—' };
}

export function expenseMatchesFilter(
  row: ExpenseRow,
  filter: ExpenseFilter,
  lookups: ExpenseLookups,
): boolean {
  if (filter.status && filter.status !== 'all' && row.status !== filter.status) return false;
  if (filter.categoryId && row.category_id !== filter.categoryId) return false;

  const term = (filter.search ?? '').trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    lookups.categoryName(row.category_id),
    row.payee,
    row.description ?? '',
    String(row.amount),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function filterExpenses(
  rows: ExpenseRow[],
  filter: ExpenseFilter,
  lookups: ExpenseLookups,
): ExpenseRow[] {
  return rows.filter((r) => expenseMatchesFilter(r, filter, lookups));
}

export function totalExpenses(rows: ExpenseRow[]): number {
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

/** Pending expenses, oldest first — the Chaplain approval queue order (5.6). */
export function pendingOldestFirst(rows: ExpenseRow[]): ExpenseRow[] {
  return rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date));
}

export interface StatusTone {
  label: string;
  /** Tailwind classes pairing color + background; always shown with an icon. */
  className: string;
}

/** Presentation tokens for an expense status (color + label; icon at the call site). */
export function statusTone(status: ExpenseStatus): StatusTone {
  switch (status) {
    case 'approved':
      return { label: 'Approved', className: 'bg-success/10 text-success' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-warning/10 text-warning' };
    case 'pending':
    default:
      return { label: 'Pending', className: 'bg-brand-100 text-brand-700' };
  }
}
