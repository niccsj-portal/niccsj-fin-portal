import { describe, expect, it } from 'vitest';

import type { CategoryRow } from '@/lib/contributions/types';
import {
  buildTransactionLookups,
  filterTransactions,
  monthToDate,
  periodLabel,
  reportStatusTone,
  totals,
  transactionsToCsv,
} from '@/lib/subAccounts/search';
import type { SubAccountTransactionRow } from '@/lib/subAccounts/types';

function txn(over: Partial<SubAccountTransactionRow>): SubAccountTransactionRow {
  return {
    id: 't',
    sub_account_id: 's1',
    direction: 'income',
    category_id: null,
    payee: null,
    description: null,
    amount: 100,
    txn_date: '2026-03-10',
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
    ...over,
  };
}

const categories: CategoryRow[] = [
  {
    id: 'c1',
    name: 'Donations',
    type: 'income',
    parent_id: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

describe('sub-account totals + month-to-date (story 6.3)', () => {
  const rows = [
    txn({ id: 'a', direction: 'income', amount: 500, txn_date: '2026-03-02' }),
    txn({ id: 'b', direction: 'expense', amount: 200, txn_date: '2026-03-15' }),
    txn({ id: 'c', direction: 'income', amount: 100, txn_date: '2026-02-20' }),
  ];

  it('sums lifetime income, expense, and balance', () => {
    expect(totals(rows)).toEqual({ income: 600, expense: 200, balance: 400 });
  });

  it('restricts month-to-date to the given calendar month', () => {
    expect(monthToDate(rows, 2026, 3)).toEqual({ income: 500, expense: 200, balance: 300 });
  });

  it('returns zeros for a month with no activity', () => {
    expect(monthToDate(rows, 2026, 1)).toEqual({ income: 0, expense: 0, balance: 0 });
  });
});

describe('sub-account transaction filtering (story 6.3)', () => {
  const lookups = buildTransactionLookups(categories);
  const rows = [
    txn({ id: 'a', direction: 'income', category_id: 'c1', payee: 'Parish raffle' }),
    txn({ id: 'b', direction: 'expense', payee: 'Caterer' }),
  ];

  it('filters by direction', () => {
    expect(filterTransactions(rows, { direction: 'expense' }, lookups).map((r) => r.id)).toEqual([
      'b',
    ]);
  });

  it('matches a free-text search across payee + category', () => {
    expect(filterTransactions(rows, { search: 'raffle' }, lookups).map((r) => r.id)).toEqual(['a']);
    expect(filterTransactions(rows, { search: 'donations' }, lookups).map((r) => r.id)).toEqual([
      'a',
    ]);
  });

  it('returns all rows for the "all" direction with no search', () => {
    expect(filterTransactions(rows, { direction: 'all' }, lookups)).toHaveLength(2);
  });
});

describe('sub-account presentation tokens', () => {
  it('labels report statuses by name (never color alone)', () => {
    expect(reportStatusTone('submitted').label).toBe('Submitted');
    expect(reportStatusTone('acknowledged').label).toBe('Acknowledged');
  });

  it('formats a human period label', () => {
    expect(periodLabel(2026, 3)).toBe('March 2026');
  });
});

describe('sub-account CSV export (story 6.3, group-scoped)', () => {
  const lookups = buildTransactionLookups(categories);

  it('produces a header row plus one line per transaction', () => {
    const csv = transactionsToCsv(
      [txn({ direction: 'income', category_id: 'c1', payee: 'Raffle', amount: 250 })],
      lookups,
    );
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Direction,Category,Payee,Description,Amount');
    expect(lines[1]).toContain('income');
    expect(lines[1]).toContain('Donations');
    expect(lines[1]).toContain('250');
  });

  it('escapes values containing commas or quotes', () => {
    const csv = transactionsToCsv(
      [txn({ payee: 'Smith, John', description: 'Said "thanks"' })],
      lookups,
    );
    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain('"Said ""thanks"""');
  });
});
