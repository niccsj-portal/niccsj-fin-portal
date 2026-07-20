import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { MemberFormPage } from '@/routes/members/MemberFormPage';
import type { MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

const existing: MemberRow = {
  id: 'm1',
  member_number: 5,
  first_name: 'Ada',
  last_name: 'Okafor',
  email: 'ada@example.com',
  phone: '555',
  address: '1 Main St',
  joined_date: '2020-01-01',
  household_id: null,
  role_in_household: 'head',
  baptism_status: 'baptized',
  is_active: true,
  created_at: '',
  updated_at: '',
};

function renderForm(path: string, client: ReturnType<typeof makeAppClient>['client']) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/members/new" element={<MemberFormPage />} />
          <Route path="/members/:id" element={<MemberFormPage />} />
          <Route path="/members" element={<div>Members list page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('MemberFormPage — create', () => {
  it('pre-fills the suggested member number', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: { households: { rows: [] } },
      nextNumber: 79,
    });
    renderForm('/members/new', client);
    const input = (await screen.findByLabelText(/member number/i)) as HTMLInputElement;
    expect(input.value).toBe('79');
  });

  it('shows validation errors for missing required fields', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: { households: { rows: [] } },
      nextNumber: 79,
    });
    renderForm('/members/new', client);
    await screen.findByLabelText(/member number/i);
    fireEvent.click(screen.getByRole('button', { name: /save member/i }));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
  });

  it('creates the member and navigates to the list', async () => {
    const app = makeAppClient({
      role: 'admin',
      tables: { households: { rows: [] }, members: { single: existing } },
      nextNumber: 79,
    });
    renderForm('/members/new', app.client);
    await screen.findByLabelText(/member number/i);
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Member' } });
    fireEvent.click(screen.getByRole('button', { name: /save member/i }));
    expect(await screen.findByText('Members list page')).toBeInTheDocument();
    expect(app.calls.inserted).toMatchObject({ first_name: 'New', last_name: 'Member' });
  });
});

describe('MemberFormPage — edit', () => {
  it('loads the existing member into the form', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: { households: { rows: [] }, members: { single: existing } },
    });
    renderForm('/members/m1', client);
    const first = (await screen.findByLabelText(/first name/i)) as HTMLInputElement;
    await waitFor(() => expect(first.value).toBe('Ada'));
    expect(screen.getByRole('heading', { name: /edit member/i })).toBeInTheDocument();
  });
});
