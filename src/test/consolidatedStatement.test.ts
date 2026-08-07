import { describe, expect, it } from 'vitest';

import type { ContributionRow } from '@/lib/contributions/types';
import type { ExpenseRow } from '@/lib/expenses/types';
import type { SubAccountReportRow, SubAccountRow } from '@/lib/subAccounts/types';
import {
  consolidatedStatement,
  contributionsInRange,
  expensesInRange,
  periodRange,
  subAccountRollups,
} from '@/lib/reports/aggregate';
import { consolidatedStatementToCsv } from '@/lib/reports/csv';
import {
  CONSOLIDATED_STATEMENT_ROLES,
  canViewConsolidatedStatement,
  navItemsForRole,
  type AppRole,
} from '@/lib/auth/roles';

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

function subAccount(id: string, name: string): SubAccountRow {
  return {
    id,
    slug: name.toLowerCase(),
    name,
    description: null,
    is_active: true,
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

const categoryName = (id: string) => (id === 'cat1' ? 'CMO Dues' : id);

describe('consolidatedStatement (story 11.10)', () => {
  const range = periodRange({ kind: 'month', year: 2026, month: 3 });
  const subs = [subAccount('s1', 'CMO'), subAccount('s2', 'CWO')];
  const reports = [
    report({ id: 'r1', sub_account_id: 's1', total_income: 200, total_expense: 50, opening_balance: 100, closing_balance: 250 }),
    report({ id: 'r2', sub_account_id: 's2', total_income: 300, total_expense: 20, opening_balance: 10, closing_balance: 290 }),
  ];

  function build() {
    const contributions = [contribution({ amount: 500, category_id: 'cat1' })];
    const expenses = [expense({ amount: 40, status: 'approved' })];
    const rollups = subAccountRollups(reports, subs, { kind: 'month', year: 2026, month: 3 });
    return consolidatedStatement({
      periodLabel: range.label,
      contributions: contributionsInRange(contributions, range),
      expenses: expensesInRange(expenses, range),
      categoryName,
      rollups,
    });
  }

  it('rolls up the general account income, approved expense, and net', () => {
    const s = build();
    expect(s.main.income).toBe(500);
    expect(s.main.expense).toBe(40);
    expect(s.main.net).toBe(460);
    expect(s.main.categories).toEqual([{ categoryId: 'cat1', name: 'CMO Dues', total: 500 }]);
  });

  it('sums every sub-account into the sub-total', () => {
    const s = build();
    expect(s.subAccounts).toHaveLength(2);
    expect(s.subTotal).toEqual({ opening: 110, income: 500, expense: 70, closing: 540 });
  });

  it('computes the parish-wide grand total as general + all groups', () => {
    const s = build();
    // income: 500 general + 500 groups; expense: 40 general + 70 groups
    expect(s.grand.income).toBe(1000);
    expect(s.grand.expense).toBe(110);
    expect(s.grand.net).toBe(890);
  });

  it('handles a period with no sub-account reports (zero sub-totals)', () => {
    const s = consolidatedStatement({
      periodLabel: range.label,
      contributions: [contribution({ amount: 100, category_id: 'cat1' })],
      expenses: [],
      categoryName,
      rollups: [],
    });
    expect(s.subAccounts).toHaveLength(0);
    expect(s.subTotal).toEqual({ opening: 0, income: 0, expense: 0, closing: 0 });
    expect(s.grand.income).toBe(100);
    expect(s.grand.net).toBe(100);
  });
});

describe('consolidatedStatementToCsv (story 11.10)', () => {
  it('emits the general, sub-account, and parish-wide sections', () => {
    const csv = consolidatedStatementToCsv({
      periodLabel: 'March 2026',
      main: { income: 500, expense: 40, net: 460, pending: 0, categories: [{ categoryId: 'cat1', name: 'CMO Dues', total: 500 }] },
      subAccounts: [
        { subAccountId: 's1', name: 'CMO', opening: 100, income: 200, expense: 50, closing: 250 },
      ],
      subTotal: { opening: 100, income: 200, expense: 50, closing: 250 },
      grand: { income: 700, expense: 90, net: 610 },
    });
    expect(csv).toContain('Consolidated Financial Statement');
    expect(csv).toContain('General income by category');
    expect(csv).toContain('CMO Dues,500');
    expect(csv).toContain('All sub-accounts,100,200,50,250');
    expect(csv).toContain('Total income (general + groups),700');
    expect(csv).toContain('Net position,610');
  });
});

describe('consolidated statement permissions (story 11.10)', () => {
  it('admits FS / Treasurer / Admin and excludes everyone else (chaplain deferred)', () => {
    for (const r of CONSOLIDATED_STATEMENT_ROLES) {
      expect(canViewConsolidatedStatement(r)).toBe(true);
    }
    for (const r of ['chaplain', 'group_fin_sec', 'finance_council', 'member'] as AppRole[]) {
      expect(canViewConsolidatedStatement(r)).toBe(false);
    }
    expect(canViewConsolidatedStatement(null)).toBe(false);
  });

  it('shows the Consolidated statement nav item exactly to the permitted set', () => {
    const hasItem = (role: AppRole) =>
      navItemsForRole(role).some((n) => n.key === 'consolidated-statement');
    expect(hasItem('fin_secretary')).toBe(true);
    expect(hasItem('treasurer')).toBe(true);
    expect(hasItem('admin')).toBe(true);
    expect(hasItem('chaplain')).toBe(false);
    expect(hasItem('member')).toBe(false);
  });
});
