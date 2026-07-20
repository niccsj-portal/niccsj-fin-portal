import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import type { CategoryRow } from '@/lib/contributions/types';
import type {
  SubAccountRow,
  SubAccountTransactionRow,
} from '@/lib/subAccounts/types';
import { SubAccountManagerPage } from '@/routes/sub-accounts/SubAccountManagerPage';
import { makeAppClient } from './helpers/fakeDb';

const cmo: SubAccountRow = {
  id: 's1',
  slug: 'cmo',
  name: 'Catholic Men Organisation (CMO)',
  description: null,
  is_active: true,
  created_at: '',
  updated_at: '',
};

const categories: CategoryRow[] = [
  {
    id: 'c1',
    name: 'Group Donations',
    type: 'income',
    parent_id: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

function txn(over: Partial<SubAccountTransactionRow>): SubAccountTransactionRow {
  return {
    id: 't',
    sub_account_id: 's1',
    direction: 'income',
    category_id: null,
    payee: null,
    description: null,
    amount: 100,
    txn_date: '2026-03-02',
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

function renderPage(role: string, opts: { subAccounts?: SubAccountRow[] } = {}) {
  const { client, calls, from } = makeAppClient({
    role,
    tables: {
      sub_accounts: { rows: opts.subAccounts ?? [cmo] },
      categories: { rows: categories },
      sub_account_transactions: {
        rows: [
          txn({ id: 'a', direction: 'income', amount: 500, payee: 'Raffle' }),
          txn({ id: 'b', direction: 'expense', amount: 200, payee: 'Caterer' }),
        ],
        single: txn({ id: 'new' }),
      },
      sub_account_reports: { rows: [] },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <SubAccountManagerPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return { client, calls, from };
}

describe('Sub-Account Manager page (stories 6.3 / 6.5 / 6.6)', () => {
  it('shows the group balance and the transaction ledger', async () => {
    renderPage('group_fin_sec');
    expect(await screen.findByText('Catholic Men Organisation (CMO)')).toBeInTheDocument();
    // Lifetime balance 500 income − 200 expense = $300.00 (loads in a 2nd effect)
    expect(await screen.findByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('Raffle')).toBeInTheDocument();
    expect(screen.getByText('Caterer')).toBeInTheDocument();
  });

  it('gives the assigned manager an income/expense record form', async () => {
    renderPage('group_fin_sec');
    expect(await screen.findByRole('form', { name: /record a transaction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
  });

  it('records a transaction via insert when the manager submits', async () => {
    const { calls } = renderPage('group_fin_sec');
    await screen.findByRole('form', { name: /record a transaction/i });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /add entry/i }));
    await waitFor(() =>
      expect(calls.inserted).toMatchObject({ sub_account_id: 's1', direction: 'income' }),
    );
  });

  it('is read-only for overseers — no record form (group isolation, §6.6)', async () => {
    renderPage('finance_council');
    expect(await screen.findByText('Transactions')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /record a transaction/i })).not.toBeInTheDocument();
  });

  it('tells an unassigned user they have no sub-account', async () => {
    renderPage('group_fin_sec', { subAccounts: [] });
    expect(await screen.findByText(/not assigned to a group sub-account/i)).toBeInTheDocument();
  });
});
