import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ContributionsPage } from '@/routes/ContributionsPage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

type FakeTables = Record<
  string,
  { rows?: unknown[]; single?: unknown; error?: { message: string } | null }
>;

function renderContributions(role: string, tables: FakeTables = {}) {
  const { client } = makeAppClient({
    role,
    memberId: role === 'member' ? 'm1' : null,
    tables,
  });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <ContributionsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Family contributions — member view (stories 3.3/4.6)', () => {
  it('shows a calm empty state with a year selector when nothing is recorded', async () => {
    renderContributions('member');
    expect(
      await screen.findByRole('heading', { name: /family contributions/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
    expect(screen.getByText(/no contributions recorded yet/i)).toBeInTheDocument();
  });

  it('shows the yearly total and a chart/table toggle when data exists', async () => {
    renderContributions('member', {
      categories: {
        rows: [{ id: 'cmo', name: 'CMO Dues', type: 'income', parent_id: null, is_active: true }],
      },
      contributions: {
        rows: [
          {
            id: 'c1',
            household_id: 'h1',
            member_id: 'm1',
            category_id: 'cmo',
            amount: 120,
            contribution_date: `${yr}-02-01`,
            payment_method: 'cash',
            notes: null,
            correction_reason: null,
            is_active: true,
          },
        ],
      },
    });
    expect((await screen.findAllByText('$120.00')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /view as table/i }));
    expect(screen.getByRole('columnheader', { name: /category/i })).toBeInTheDocument();
  });
});

describe('Contributions landing — staff routing (story 4.4)', () => {
  it('routes a recorder to the admin ledger, not the family view', async () => {
    renderContributions('admin');
    expect(await screen.findByRole('heading', { name: /^contributions$/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /record contribution/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no contributions recorded yet/i)).not.toBeInTheDocument();
  });
});
