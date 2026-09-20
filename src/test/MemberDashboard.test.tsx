import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { DashboardPage } from '@/routes/DashboardPage';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

const member: MemberRow = {
  id: 'm1',
  member_number: 1,
  first_name: 'Ada',
  last_name: 'Okafor',
  email: 'ada@example.test',
  phone: '555-0100',
  address: '1 Grace St',
  joined_date: '2026-01-01',
  household_id: 'h1',
  role_in_household: 'head',
  baptism_status: 'baptized',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const household: HouseholdRow = {
  id: 'h1',
  name: 'Okafor Family',
  family_number: 1,
  primary_member_id: 'm1',
  is_active: true,
  opening_balance: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderDashboard(role = 'member', memberId: string | null = 'm1') {
  const { client } = makeAppClient({
    role,
    memberId,
    tables: {
      members: { single: member },
      households: { rows: [household] },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Member dashboard (story 3.1)', () => {
  it('greets the member by name and shows their household', async () => {
    renderDashboard();
    expect(await screen.findByText(/Welcome, Ada Okafor/)).toBeInTheDocument();
    expect(screen.getByText('Okafor Family')).toBeInTheDocument();
  });

  it('shows the "This Year at a Glance" KPI card with a $0 placeholder total', async () => {
    renderDashboard();
    expect(await screen.findByText(/This Year at a Glance/i)).toBeInTheDocument();
    expect(screen.getByTestId('ytd-total')).toHaveTextContent('$0.00');
  });

  it('shows the real current-year total and per-category breakdown', async () => {
    const year = new Date().getFullYear();
    const { client } = makeAppClient({
      role: 'member',
      memberId: 'm1',
      tables: {
        members: { single: member },
        households: { rows: [household] },
        categories: { rows: [{ id: 'c1', name: 'CMO Dues', type: 'income', parent_id: null, is_active: true }] },
        contributions: {
          rows: [
            { id: 'k1', member_id: 'm1', household_id: 'h1', contribution_date: `${year}-03-01`, amount: 50, category_id: 'c1', payment_method: 'cash', is_active: true, created_by: null, updated_by: null, created_at: '', updated_at: '' },
            { id: 'k2', member_id: 'm1', household_id: 'h1', contribution_date: `${year}-04-01`, amount: 25, category_id: 'c1', payment_method: 'cash', is_active: true, created_by: null, updated_by: null, created_at: '', updated_at: '' },
          ],
        },
      },
    });
    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    // Wait for the async load to complete (member name resolves) before
    // reading the KPI, so we don't observe the initial $0 placeholder.
    await screen.findByText(/Welcome, Ada Okafor/);
    expect(await screen.findByText('CMO Dues')).toBeInTheDocument();
    expect(screen.getByTestId('ytd-total')).toHaveTextContent('$75.00');
  });

  it('shows an empty recent-contributions state', async () => {
    renderDashboard();
    expect(await screen.findByText(/no contributions recorded yet/i)).toBeInTheDocument();
  });

  it('lists group dues attributed to the member', async () => {
    const { client } = makeAppClient({
      role: 'member',
      memberId: 'm1',
      tables: {
        members: { single: member },
        households: { rows: [household] },
        sub_account_transactions: {
          rows: [
            {
              id: 'd1',
              sub_account_id: 's1',
              direction: 'income',
              category_id: 'dues',
              member_id: 'm1',
              payee: 'Ada Okafor (#1)',
              description: null,
              amount: 20,
              txn_date: '2026-03-02',
              is_active: true,
              created_by: null,
              updated_by: null,
              created_at: '',
              updated_at: '',
              sub_accounts: { name: 'Catholic Men Organisation (CMO)', slug: 'cmo' },
            },
          ],
        },
      },
    });
    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByText(/Welcome, Ada Okafor/);
    expect(await screen.findByText(/Group dues/i)).toBeInTheDocument();
    expect(screen.getByText(/Catholic Men Organisation \(CMO\)/)).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });

  it('shows an empty group-dues state when none are attributed', async () => {
    renderDashboard();
    expect(await screen.findByText(/no group dues applied to you yet/i)).toBeInTheDocument();
  });

  it('offers a disabled "download annual family summary" action', async () => {
    renderDashboard();
    const cta = await screen.findByRole('button', { name: /annual family summary/i });
    expect(cta).toBeDisabled();
  });

  it('keeps the generic welcome for non-member roles', async () => {
    renderDashboard('admin', null);
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
    expect(screen.queryByText(/This Year at a Glance/i)).not.toBeInTheDocument();
  });
});
