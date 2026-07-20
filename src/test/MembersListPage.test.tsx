import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { MembersListPage } from '@/routes/members/MembersListPage';
import type { MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

const rows: MemberRow[] = [
  {
    id: 'm1',
    member_number: 1,
    first_name: 'Ada',
    last_name: 'Okafor',
    email: 'ada@example.com',
    phone: null,
    address: null,
    joined_date: '2020-01-01',
    household_id: 'h1',
    role_in_household: 'head',
    baptism_status: 'baptized',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'm2',
    member_number: 2,
    first_name: 'Emeka',
    last_name: 'Nwosu',
    email: 'emeka@example.com',
    phone: null,
    address: null,
    joined_date: '2021-01-01',
    household_id: 'h1',
    role_in_household: 'spouse',
    baptism_status: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const households = [
  {
    id: 'h1',
    name: 'Okafor Family',
    primary_member_id: 'm1',
    is_active: true,
    opening_balance: 0,
    created_at: '',
    updated_at: '',
  },
];

function renderPage(role: string) {
  const { client } = makeAppClient({
    role,
    tables: { members: { rows }, households: { rows: households } },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <MembersListPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('MembersListPage', () => {
  it('lists members for an admin with editor actions', async () => {
    renderPage('admin');
    expect(await screen.findByText('Ada Okafor')).toBeInTheDocument();
    expect(screen.getByText('Emeka Nwosu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new member/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /import csv/i })).toBeInTheDocument();
  });

  it('filters the visible rows by the search box', async () => {
    renderPage('admin');
    await screen.findByText('Ada Okafor');
    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: 'emeka' } });
    expect(screen.queryByText('Ada Okafor')).not.toBeInTheDocument();
    expect(screen.getByText('Emeka Nwosu')).toBeInTheDocument();
  });

  it('hides create/edit affordances for a non-editor (treasurer)', async () => {
    renderPage('treasurer');
    expect(await screen.findByText('Ada Okafor')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new member/i })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument(),
    );
  });
});
