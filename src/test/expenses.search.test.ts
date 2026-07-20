import { describe, expect, it } from 'vitest';

import type { CategoryRow } from '@/lib/contributions/types';
import {
  buildExpenseLookups,
  expenseYear,
  filterExpenses,
  formatUSD,
  pendingOldestFirst,
  statusTone,
  totalExpenses,
} from '@/lib/expenses/search';
import type { ExpenseRow } from '@/lib/expenses/types';

function expense(over: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: 'e1',
    category_id: 'cat1',
    payee: 'PG&E',
    description: null,
    expense_date: '2026-06-01',
    amount: 100,
    status: 'pending',
    receipt_path: null,
    rejection_reason: null,
    submitted_by: 'u1',
    approved_by: null,
    decided_at: null,
    is_active: true,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...over,
  };
}

const categories: CategoryRow[] = [
  { id: 'cat1', name: 'Utilities', type: 'expense', parent_id: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'cat2', name: 'Charity & Welfare', type: 'expense', parent_id: null, is_active: true, created_at: '', updated_at: '' },
];

describe('expense search helpers (stories 5.5/5.6)', () => {
  const lookups = buildExpenseLookups(categories);

  it('derives the year from the date', () => {
    expect(expenseYear(expense({ expense_date: '2025-12-31' }))).toBe(2025);
  });

  it('filters by status', () => {
    const rows = [expense({ id: 'a', status: 'pending' }), expense({ id: 'b', status: 'approved' })];
    expect(filterExpenses(rows, { status: 'approved' }, lookups).map((r) => r.id)).toEqual(['b']);
    expect(filterExpenses(rows, { status: 'all' }, lookups)).toHaveLength(2);
  });

  it('filters by category', () => {
    const rows = [expense({ id: 'a', category_id: 'cat1' }), expense({ id: 'b', category_id: 'cat2' })];
    expect(filterExpenses(rows, { categoryId: 'cat2' }, lookups).map((r) => r.id)).toEqual(['b']);
  });

  it('free-text searches payee, description, category and amount', () => {
    const rows = [
      expense({ id: 'a', payee: 'PG&E' }),
      expense({ id: 'b', payee: 'Caterer', description: 'Harvest feast' }),
      expense({ id: 'c', category_id: 'cat2' }),
    ];
    expect(filterExpenses(rows, { search: 'harvest' }, lookups).map((r) => r.id)).toEqual(['b']);
    expect(filterExpenses(rows, { search: 'welfare' }, lookups).map((r) => r.id)).toEqual(['c']);
  });

  it('totals amounts', () => {
    expect(totalExpenses([expense({ amount: 100 }), expense({ amount: 50.5 })])).toBeCloseTo(150.5);
  });

  it('returns pending expenses oldest first for the approval queue', () => {
    const rows = [
      expense({ id: 'new', status: 'pending', expense_date: '2026-06-10' }),
      expense({ id: 'old', status: 'pending', expense_date: '2026-06-01' }),
      expense({ id: 'done', status: 'approved', expense_date: '2026-05-01' }),
    ];
    expect(pendingOldestFirst(rows).map((r) => r.id)).toEqual(['old', 'new']);
  });

  it('gives each status a label + color class (icon+label+color, never color alone)', () => {
    expect(statusTone('pending').label).toBe('Pending');
    expect(statusTone('approved').label).toBe('Approved');
    expect(statusTone('rejected').label).toBe('Rejected');
    expect(statusTone('approved').className).toContain('text-success');
    expect(statusTone('rejected').className).toContain('text-warning');
  });

  it('formats amounts as USD', () => {
    expect(formatUSD(1200)).toBe('$1,200.00');
  });
});
