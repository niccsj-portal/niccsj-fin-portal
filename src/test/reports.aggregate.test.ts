import { describe, expect, it } from 'vitest';

import type { ContributionRow } from '@/lib/contributions/types';
import type { ExpenseRow } from '@/lib/expenses/types';
import type { HouseholdRow } from '@/lib/members/types';
import type { SubAccountReportRow, SubAccountRow } from '@/lib/subAccounts/types';
import {
  contributionsInRange,
  expensesInRange,
  financeKpis,
  monthlyTrend,
  participationRate,
  periodRange,
  subAccountRollups,
} from '@/lib/reports/aggregate';
import { financeReportToCsv } from '@/lib/reports/csv';

function contribution(over: Partial<ContributionRow>): ContributionRow {
  return {
    id: 'c',
    member_id: null,
    household_id: 'h1',
    contribution_date: '2026-03-10',
    amount: 100,
    category_id: 'cat1',
    payment_method: 'cash',
    notes: null,
    correction_reason: null,
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

function expense(over: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: 'e',
    category_id: 'cat9',
    payee: 'Vendor',
    description: null,
    expense_date: '2026-03-12',
    amount: 40,
    status: 'approved',
    receipt_path: null,
    rejection_reason: null,
    submitted_by: null,
    approved_by: null,
    decided_at: null,
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

function household(id: string): HouseholdRow {
  return {
    id,
    name: `Household ${id}`,
    family_number: null,
    primary_member_id: null,
    is_active: true,
    opening_balance: 0,
    created_at: '',
    updated_at: '',
  };
}

function report(over: Partial<SubAccountReportRow>): SubAccountReportRow {
  return {
    id: 'r',
    sub_account_id: 's1',
    period_year: 2026,
    period_month: 3,
    opening_balance: 100,
    total_income: 200,
    total_expense: 50,
    closing_balance: 250,
    status: 'submitted',
    submitted_by: null,
    submitted_at: '',
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: '',
    ...over,
  };
}

describe('periodRange (story 7.4)', () => {
  it('spans a single calendar month', () => {
    expect(periodRange({ kind: 'month', year: 2026, month: 2 })).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
      label: 'February 2026',
    });
  });

  it('spans a quarter (Q2 = Apr–Jun)', () => {
    expect(periodRange({ kind: 'quarter', year: 2026, quarter: 2 })).toEqual({
      start: '2026-04-01',
      end: '2026-06-30',
      label: 'Q2 2026',
    });
  });

  it('spans the whole year', () => {
    expect(periodRange({ kind: 'year', year: 2026 })).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
      label: '2026',
    });
  });
});

describe('range filtering', () => {
  const range = periodRange({ kind: 'month', year: 2026, month: 3 });

  it('keeps only contributions inside the range', () => {
    const rows = [
      contribution({ id: 'in', contribution_date: '2026-03-15' }),
      contribution({ id: 'before', contribution_date: '2026-02-28' }),
      contribution({ id: 'after', contribution_date: '2026-04-01' }),
    ];
    expect(contributionsInRange(rows, range).map((r) => r.id)).toEqual(['in']);
  });

  it('keeps only expenses inside the range', () => {
    const rows = [
      expense({ id: 'in', expense_date: '2026-03-01' }),
      expense({ id: 'out', expense_date: '2026-05-01' }),
    ];
    expect(expensesInRange(rows, range).map((r) => r.id)).toEqual(['in']);
  });
});

describe('financeKpis (story 7.1)', () => {
  it('sums income, approved expense, net, and pending count', () => {
    const contributions = [contribution({ amount: 500 }), contribution({ amount: 250 })];
    const expenses = [
      expense({ amount: 200, status: 'approved' }),
      expense({ amount: 999, status: 'pending' }),
      expense({ amount: 40, status: 'rejected' }),
    ];
    expect(financeKpis(contributions, expenses)).toEqual({
      income: 750,
      expense: 200,
      net: 550,
      pending: 1,
    });
  });
});

describe('monthlyTrend (story 7.1)', () => {
  it('buckets income and approved expense by month for the year', () => {
    const contributions = [
      contribution({ contribution_date: '2026-01-05', amount: 100 }),
      contribution({ contribution_date: '2026-01-20', amount: 50 }),
      contribution({ contribution_date: '2025-01-01', amount: 999 }),
    ];
    const expenses = [
      expense({ expense_date: '2026-01-10', amount: 30, status: 'approved' }),
      expense({ expense_date: '2026-01-11', amount: 70, status: 'pending' }),
    ];
    const trend = monthlyTrend(contributions, expenses, 2026);
    expect(trend).toHaveLength(12);
    expect(trend[0]).toEqual({ month: 1, label: 'Jan', income: 150, expense: 30 });
    expect(trend[1]).toEqual({ month: 2, label: 'Feb', income: 0, expense: 0 });
  });
});

describe('participationRate (story 7.2)', () => {
  it('counts distinct contributing households over the total', () => {
    const households = [household('h1'), household('h2'), household('h3'), household('h4')];
    const contributions = [
      contribution({ household_id: 'h1' }),
      contribution({ household_id: 'h1' }),
      contribution({ household_id: 'h2' }),
    ];
    expect(participationRate(households, contributions)).toEqual({
      contributing: 2,
      total: 4,
      rate: 0.5,
    });
  });

  it('is zero-safe with no households', () => {
    expect(participationRate([], [])).toEqual({ contributing: 0, total: 0, rate: 0 });
  });
});

describe('subAccountRollups (story 7.5)', () => {
  const subAccounts: SubAccountRow[] = [
    { id: 's1', slug: 'cmo', name: "Men's Group", description: null, is_active: true, created_at: '', updated_at: '' },
    { id: 's2', slug: 'cwo', name: "Women's Group", description: null, is_active: true, created_at: '', updated_at: '' },
  ];

  it('produces one opening/income/expense/closing row per group for a month', () => {
    const reports = [
      report({ sub_account_id: 's1', period_month: 3, opening_balance: 100, total_income: 200, total_expense: 50, closing_balance: 250 }),
      report({ sub_account_id: 's2', period_month: 3, opening_balance: 10, total_income: 5, total_expense: 2, closing_balance: 13 }),
    ];
    const rollups = subAccountRollups(reports, subAccounts, { kind: 'month', year: 2026, month: 3 });
    expect(rollups).toEqual([
      { subAccountId: 's1', name: "Men's Group", opening: 100, income: 200, expense: 50, closing: 250 },
      { subAccountId: 's2', name: "Women's Group", opening: 10, income: 5, expense: 2, closing: 13 },
    ]);
  });

  it('aggregates a quarter: opening from first period, closing from last, sums between', () => {
    const reports = [
      report({ id: 'a', sub_account_id: 's1', period_month: 4, opening_balance: 100, total_income: 20, total_expense: 5, closing_balance: 115 }),
      report({ id: 'b', sub_account_id: 's1', period_month: 6, opening_balance: 115, total_income: 30, total_expense: 10, closing_balance: 135 }),
    ];
    const rollups = subAccountRollups(reports, subAccounts, { kind: 'quarter', year: 2026, quarter: 2 });
    expect(rollups).toEqual([
      { subAccountId: 's1', name: "Men's Group", opening: 100, income: 50, expense: 15, closing: 135 },
    ]);
  });

  it('omits groups with no report in the period', () => {
    const reports = [report({ sub_account_id: 's1', period_month: 3 })];
    const rollups = subAccountRollups(reports, subAccounts, { kind: 'month', year: 2026, month: 8 });
    expect(rollups).toEqual([]);
  });
});

describe('financeReportToCsv (story 7.4)', () => {
  it('writes KPI, category, and rollup sections with plain-number amounts', () => {
    const csv = financeReportToCsv({
      title: 'Treasurer Finance Report',
      periodLabel: 'March 2026',
      kpis: { income: 750, expense: 200, net: 550, pending: 1 },
      categories: [{ categoryId: 'c1', name: 'Dues', total: 750 }],
      rollups: [{ subAccountId: 's1', name: "Men's Group", opening: 100, income: 200, expense: 50, closing: 250 }],
    });
    expect(csv).toContain('Treasurer Finance Report');
    expect(csv).toContain('Period,March 2026');
    expect(csv).toContain('Income,750');
    expect(csv).toContain('Net balance,550');
    expect(csv).toContain('Dues,750');
    expect(csv).toContain('Sub-account,Opening,Income,Expense,Closing');
    expect(csv).toContain("Men's Group,100,200,50,250");
  });

  it('escapes a category name containing a comma', () => {
    const csv = financeReportToCsv({
      title: 'R',
      periodLabel: '2026',
      kpis: { income: 0, expense: 0, net: 0, pending: 0 },
      categories: [{ categoryId: 'c1', name: 'Dues, annual', total: 10 }],
    });
    expect(csv).toContain('"Dues, annual",10');
  });
});
