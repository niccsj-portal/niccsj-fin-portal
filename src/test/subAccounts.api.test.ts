import { describe, expect, it } from 'vitest';

import {
  listMemberSubAccountDues,
  listSubAccountCategoryIds,
  listSubAccountReports,
  listSubAccountTransactions,
  listSubAccounts,
  recordSubAccountTransaction,
  submitSubAccountReport,
} from '@/lib/subAccounts/api';
import type {
  SubAccountReportRow,
  SubAccountRow,
  SubAccountTransactionRow,
} from '@/lib/subAccounts/types';
import { makeAppClient } from './helpers/fakeDb';

const sub: SubAccountRow = {
  id: 's1',
  slug: 'cmo',
  name: 'Catholic Men Organisation (CMO)',
  description: null,
  is_active: true,
  created_at: '',
  updated_at: '',
};

const txn: SubAccountTransactionRow = {
  id: 't1',
  sub_account_id: 's1',
  direction: 'income',
  category_id: null,
  member_id: null,
  payee: 'Raffle',
  description: null,
  amount: 200,
  txn_date: '2026-03-01',
  is_active: true,
  created_by: null,
  updated_by: null,
  created_at: '',
  updated_at: '',
};

describe('sub-account data access (story 6.3)', () => {
  it('lists active sub-accounts by name', async () => {
    const { client, calls } = makeAppClient({
      tables: { sub_accounts: { rows: [sub] } },
    });
    const rows = await listSubAccounts(client);
    expect(rows).toHaveLength(1);
    expect(calls.filters).toContainEqual(['is_active', true]);
    expect(calls.ordered).toContainEqual(['name', { ascending: true }]);
  });

  it('scopes transaction reads to a sub-account and active rows', async () => {
    const { client, calls } = makeAppClient({
      tables: { sub_account_transactions: { rows: [txn] } },
    });
    const rows = await listSubAccountTransactions(client, 's1', { direction: 'income' });
    expect(rows).toHaveLength(1);
    expect(calls.filters).toContainEqual(['sub_account_id', 's1']);
    expect(calls.filters).toContainEqual(['is_active', true]);
    expect(calls.filters).toContainEqual(['direction', 'income']);
  });

  it('records a transaction via a plain insert (RLS enforces assignment)', async () => {
    const { client, calls } = makeAppClient({
      tables: { sub_account_transactions: { single: txn } },
    });
    const created = await recordSubAccountTransaction(client, {
      sub_account_id: 's1',
      direction: 'income',
      category_id: null,
      member_id: null,
      payee: 'Raffle',
      description: null,
      amount: 200,
      txn_date: '2026-03-01',
    });
    expect(created.id).toBe('t1');
    expect(calls.inserted).toMatchObject({ sub_account_id: 's1', direction: 'income' });
  });

  it('attributes a dues payment to a member on insert', async () => {
    const { client, calls } = makeAppClient({
      tables: { sub_account_transactions: { single: { ...txn, member_id: 'm1' } } },
    });
    await recordSubAccountTransaction(client, {
      sub_account_id: 's1',
      direction: 'income',
      category_id: 'cmo',
      member_id: 'm1',
      payee: 'Ada Obi (#12)',
      description: null,
      amount: 20,
      txn_date: '2026-03-01',
    });
    expect(calls.inserted).toMatchObject({ member_id: 'm1', payee: 'Ada Obi (#12)' });
  });

  it('lists the category ids a group may record against', async () => {
    const { client, calls } = makeAppClient({
      tables: {
        sub_account_categories: {
          rows: [{ category_id: 'cmo' }, { category_id: 'don' }],
        },
      },
    });
    const ids = await listSubAccountCategoryIds(client, 's1');
    expect(ids).toEqual(['cmo', 'don']);
    expect(calls.filters).toContainEqual(['sub_account_id', 's1']);
  });

  it('lists the group dues attributed to a member, newest first', async () => {
    const { client, calls } = makeAppClient({
      tables: {
        sub_account_transactions: {
          rows: [{ ...txn, member_id: 'm1', sub_accounts: { name: 'CMO', slug: 'cmo' } }],
        },
      },
    });
    const rows = await listMemberSubAccountDues(client, 'm1');
    expect(rows).toHaveLength(1);
    expect(calls.filters).toContainEqual(['member_id', 'm1']);
    expect(calls.filters).toContainEqual(['is_active', true]);
    expect(calls.ordered).toContainEqual(['txn_date', { ascending: false }]);
  });

  it('lists monthly reports newest period first', async () => {
    const report: SubAccountReportRow = {
      id: 'r1',
      sub_account_id: 's1',
      period_year: 2026,
      period_month: 3,
      opening_balance: 0,
      total_income: 200,
      total_expense: 0,
      closing_balance: 200,
      status: 'submitted',
      submitted_by: null,
      submitted_at: '',
      acknowledged_by: null,
      acknowledged_at: null,
      created_at: '',
    };
    const { client, calls } = makeAppClient({
      tables: { sub_account_reports: { rows: [report] } },
    });
    const rows = await listSubAccountReports(client, 's1');
    expect(rows).toHaveLength(1);
    expect(calls.ordered).toContainEqual(['period_year', { ascending: false }]);
    expect(calls.ordered).toContainEqual(['period_month', { ascending: false }]);
  });

  it('submits a monthly summary through the Edge Function', async () => {
    const { client, invoke } = makeAppClient({
      invokeResult: { data: { id: 'r1', status: 'submitted' }, error: null },
    });
    const created = await submitSubAccountReport(client, {
      sub_account_id: 's1',
      period_year: 2026,
      period_month: 3,
    });
    expect(invoke).toHaveBeenCalledWith('submit-sub-account-report', {
      body: { sub_account_id: 's1', period_year: 2026, period_month: 3 },
    });
    expect((created as { id: string }).id).toBe('r1');
  });
});
