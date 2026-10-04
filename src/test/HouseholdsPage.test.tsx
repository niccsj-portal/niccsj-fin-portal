import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { HouseholdsPage } from '@/routes/members/HouseholdsPage';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

const household: HouseholdRow = {
  id: 'h1',
  name: 'Okafor Family',
  family_number: 1,
  primary_member_id: 'm1',
  is_active: true,
  opening_balance: 0,
  created_at: '',
  updated_at: '',
};

function member(id: string, first: string): MemberRow {
  return {
    id,
    member_number: 1,
    first_name: first,
    last_name: 'Okafor',
    email: null,
    phone: null,
    address: null,
    joined_date: '2020-01-01',
    household_id: 'h1',
    role_in_household: 'head',
    baptism_status: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  };
}

function renderPage(role: string) {
  const app = makeAppClient({
    role,
    tables: {
      households: { rows: [household], single: household },
      members: { rows: [member('m1', 'Ada'), member('m2', 'Bem')] },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={app.client}>
        <HouseholdsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return app;
}

describe('HouseholdsPage', () => {
  it('lists households with member count and primary member for an editor', async () => {
    renderPage('admin');
    expect(await screen.findByText('Okafor Family')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Okafor').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText(/create household/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/set primary member for okafor family/i)).toBeInTheDocument();
  });

  it('hides create + set-primary controls for a read-only treasurer', async () => {
    renderPage('treasurer');
    expect(await screen.findByText('Okafor Family')).toBeInTheDocument();
    expect(screen.queryByLabelText(/create household/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/set primary member for okafor family/i),
    ).not.toBeInTheDocument();
  });

  it('lets an editor rename a household and correct its family number', async () => {
    const app = renderPage('admin');
    fireEvent.click(await screen.findByRole('button', { name: /edit okafor family/i }));

    fireEvent.change(screen.getByLabelText(/family number for okafor family/i), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText(/household name for okafor family/i), {
      target: { value: 'Okafor (Chinedu & Ngozi)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(app.calls.updated).toEqual({
        name: 'Okafor (Chinedu & Ngozi)',
        family_number: 7,
      }),
    );
  });

  it('leaves the row unchanged when the edit is cancelled', async () => {
    const app = renderPage('admin');
    fireEvent.click(await screen.findByRole('button', { name: /edit okafor family/i }));
    fireEvent.change(screen.getByLabelText(/household name for okafor family/i), {
      target: { value: 'Typo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(app.calls.updated).toBeNull();
    expect(screen.getByText('Okafor Family')).toBeInTheDocument();
  });

  it('does not offer an edit control to a read-only treasurer', async () => {
    renderPage('treasurer');
    expect(await screen.findByText('Okafor Family')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit okafor family/i })).not.toBeInTheDocument();
  });
});
