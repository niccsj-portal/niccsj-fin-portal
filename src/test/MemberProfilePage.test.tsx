import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { MemberProfilePage } from '@/routes/member/MemberProfilePage';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

const me: MemberRow = {
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

const spouse: MemberRow = {
  ...me,
  id: 'm2',
  member_number: 2,
  first_name: 'Chidi',
  last_name: 'Okafor',
  email: 'chidi@example.test',
  role_in_household: 'spouse',
};

const household: HouseholdRow = {
  id: 'h1',
  name: 'Okafor Family',
  primary_member_id: 'm1',
  is_active: true,
  opening_balance: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderProfile() {
  const app = makeAppClient({
    role: 'member',
    memberId: 'm1',
    tables: {
      members: { single: me, rows: [me, spouse] },
      households: { rows: [household] },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={app.client}>
        <MemberProfilePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return app;
}

describe('MemberProfilePage (story 3.2)', () => {
  it('shows read-only identity and pre-filled editable contact fields', async () => {
    renderProfile();
    expect(await screen.findByText('Okafor Family')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Okafor').length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('ada@example.test');
    expect((screen.getByLabelText(/phone/i) as HTMLInputElement).value).toBe('555-0100');
    expect((screen.getByLabelText(/address/i) as HTMLInputElement).value).toBe('1 Grace St');
  });

  it('lists the household members', async () => {
    renderProfile();
    expect(await screen.findByText('Chidi Okafor')).toBeInTheDocument();
  });

  it('saves edited contact info via the data layer', async () => {
    const app = renderProfile();
    await screen.findByText('Okafor Family');

    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-0999' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(app.calls.updated).toMatchObject({ phone: '555-0999' }),
    );
    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument();
  });

  it('rejects an invalid email', async () => {
    renderProfile();
    await screen.findByText('Okafor Family');

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });
});
