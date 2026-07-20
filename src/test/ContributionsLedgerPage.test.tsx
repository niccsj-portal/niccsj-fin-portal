import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ContributionsLedgerPage } from '@/routes/contributions/ContributionsLedgerPage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

function tables() {
  return {
    contributions: {
      rows: [
        {
          id: 'c1',
          household_id: 'h1',
          member_id: 'm1',
          category_id: 'cmo',
          amount: 100,
          contribution_date: `${yr}-03-01`,
          payment_method: 'cash',
          notes: null,
          correction_reason: null,
          is_active: true,
        },
        {
          id: 'c2',
          household_id: 'h2',
          member_id: null,
          category_id: 'off',
          amount: 50,
          contribution_date: `${yr}-04-01`,
          payment_method: 'check',
          notes: null,
          correction_reason: 'Re-keyed amount',
          is_active: true,
        },
      ],
    },
    categories: {
      rows: [
        { id: 'cmo', name: 'CMO Dues', type: 'income', parent_id: null, is_active: true },
        { id: 'off', name: 'Offertory', type: 'income', parent_id: null, is_active: true },
      ],
    },
    households: {
      rows: [
        { id: 'h1', name: 'Okeke' },
        { id: 'h2', name: 'Eze' },
      ],
    },
    members: {
      rows: [{ id: 'm1', household_id: 'h1', first_name: 'Ada', last_name: 'Okeke' }],
    },
  };
}

function renderLedger(role: string) {
  const { client } = makeAppClient({ role, tables: tables() });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <ContributionsLedgerPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ContributionsLedgerPage (stories 4.4/4.7)', () => {
  it('renders every entry with a running total and corrected indicator', async () => {
    renderLedger('fin_secretary');
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('Okeke')).toBeInTheDocument();
    expect(table.getByText('Eze')).toBeInTheDocument();
    expect(table.getByText('$150.00')).toBeInTheDocument();
    expect(table.getByText(/\(corrected\)/i)).toBeInTheDocument();
  });

  it('offers the record + edit actions to a recorder', async () => {
    renderLedger('treasurer');
    expect(await screen.findByRole('link', { name: /record contribution/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^edit$/i }).length).toBeGreaterThan(0);
  });

  it('hides record + edit actions from a read-only chaplain', async () => {
    renderLedger('chaplain');
    await screen.findByRole('table');
    expect(screen.queryByRole('link', { name: /record contribution/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('filters by free-text search', async () => {
    renderLedger('fin_secretary');
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: 'Eze' } });
    const table = within(screen.getByRole('table'));
    expect(table.queryByText('Okeke')).not.toBeInTheDocument();
    expect(table.getByText('Eze')).toBeInTheDocument();
  });

  it('summarises annual dues status (story 4.7)', async () => {
    renderLedger('fin_secretary');
    expect(await screen.findByText(/annual dues/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 households/i)).toBeInTheDocument();
  });
});
