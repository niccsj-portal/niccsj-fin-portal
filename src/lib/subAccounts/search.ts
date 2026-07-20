import { formatUSD } from '@/lib/contributions/search';
import type { CategoryRow } from '@/lib/contributions/types';
import type {
  SubAccountReportStatus,
  SubAccountTransactionRow,
  SubAccountTxnDirection,
} from '@/lib/subAccounts/types';

/**
 * Client-side filtering + aggregation over the (small) sub-account transaction
 * set, plus the presentation tokens used by the Sub-Account Manager page
 * (story 6.3) and the Monthly Summary panel (story 6.5). Balances are derived
 * from active transactions only; status is always shown by color + label, never
 * color alone (PRD §6 graphics standard).
 */

export { formatUSD };

export interface TransactionFilter {
  direction?: SubAccountTxnDirection | 'all';
  categoryId?: string;
  search?: string;
}

export interface TransactionLookups {
  categoryName: (id: string | null) => string;
}

export function buildTransactionLookups(categories: CategoryRow[]): TransactionLookups {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  return { categoryName: (id) => (id ? (cat.get(id) ?? '—') : '—') };
}

export function transactionMatchesFilter(
  row: SubAccountTransactionRow,
  filter: TransactionFilter,
  lookups: TransactionLookups,
): boolean {
  if (filter.direction && filter.direction !== 'all' && row.direction !== filter.direction) {
    return false;
  }
  if (filter.categoryId && row.category_id !== filter.categoryId) return false;

  const term = (filter.search ?? '').trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    lookups.categoryName(row.category_id),
    row.payee ?? '',
    row.description ?? '',
    String(row.amount),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function filterTransactions(
  rows: SubAccountTransactionRow[],
  filter: TransactionFilter,
  lookups: TransactionLookups,
): SubAccountTransactionRow[] {
  return rows.filter((r) => transactionMatchesFilter(r, filter, lookups));
}

export interface SubAccountTotals {
  income: number;
  expense: number;
  balance: number;
}

/** Lifetime income / expense / balance over the supplied (active) rows. */
export function totals(rows: SubAccountTransactionRow[]): SubAccountTotals {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.direction === 'income') income += Number(r.amount);
    else expense += Number(r.amount);
  }
  return { income, expense, balance: income - expense };
}

/** Income / expense / balance restricted to the given calendar month (MTD). */
export function monthToDate(
  rows: SubAccountTransactionRow[],
  year: number,
  month: number,
): SubAccountTotals {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return totals(rows.filter((r) => r.txn_date.startsWith(prefix)));
}

export interface StatusTone {
  label: string;
  /** Tailwind classes pairing color + background; always shown with an icon. */
  className: string;
}

/** Presentation tokens for a report status (color + label; icon at the call site). */
export function reportStatusTone(status: SubAccountReportStatus): StatusTone {
  switch (status) {
    case 'acknowledged':
      return { label: 'Acknowledged', className: 'bg-success/10 text-success' };
    case 'submitted':
    default:
      return { label: 'Submitted', className: 'bg-brand-100 text-brand-700' };
  }
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "January 2026" for a report period. */
export function periodLabel(year: number, month: number): string {
  const name = MONTHS[month - 1] ?? String(month);
  return `${name} ${year}`;
}

/**
 * A CSV export of the supplied transactions — group-scoped only (PRD §7: a
 * Group FS exports their own data). Header + rows, amounts as plain numbers.
 */
export function transactionsToCsv(
  rows: SubAccountTransactionRow[],
  lookups: TransactionLookups,
): string {
  const header = ['Date', 'Direction', 'Category', 'Payee', 'Description', 'Amount'];
  const escape = (v: string): string =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = rows.map((r) =>
    [
      r.txn_date,
      r.direction,
      lookups.categoryName(r.category_id),
      r.payee ?? '',
      r.description ?? '',
      String(r.amount),
    ]
      .map((c) => escape(c))
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}
