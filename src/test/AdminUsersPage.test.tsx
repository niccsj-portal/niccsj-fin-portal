import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { AdminUsersPage } from '@/routes/admin/AdminUsersPage';
import { makeAppClient } from './helpers/fakeDb';

const userRows = [
  {
    id: 'u1',
    email: 'chidi@example.com',
    role: 'member',
    member_id: null,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'u2',
    email: 'ngozi@example.com',
    role: 'chaplain',
    member_id: null,
    is_active: true,
    created_at: '2026-01-02',
    updated_at: '2026-01-02',
  },
];

function setup() {
  const ctx = makeAppClient({
    role: 'admin',
    tables: { users: { rows: userRows, single: { role: 'admin', member_id: null } } },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={ctx.client}>
        <AdminUsersPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return ctx;
}

describe('AdminUsersPage', () => {
  it('lists every user with a role selector', async () => {
    setup();
    expect(await screen.findByText('chidi@example.com')).toBeInTheDocument();
    expect(screen.getByText('ngozi@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText(/role for chidi@example.com/i)).toBeInTheDocument();
  });

  it('asks for confirmation before elevating privileges', async () => {
    const { calls } = setup();
    await screen.findByText('chidi@example.com');

    // member -> admin is an elevation: a confirmation dialog appears first.
    fireEvent.change(screen.getByLabelText(/role for chidi@example.com/i), {
      target: { value: 'admin' },
    });
    expect(await screen.findByText(/confirm role elevation/i)).toBeInTheDocument();
    expect(calls.updated).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /confirm elevation/i }));
    await waitFor(() => expect(calls.updated).toEqual({ role: 'admin' }));
    expect(calls.filters).toContainEqual(['id', 'u1']);
  });

  it('applies a downgrade immediately without confirmation', async () => {
    const { calls } = setup();
    await screen.findByText('ngozi@example.com');

    // chaplain -> member is a downgrade: applied directly.
    fireEvent.change(screen.getByLabelText(/role for ngozi@example.com/i), {
      target: { value: 'member' },
    });
    await waitFor(() => expect(calls.updated).toEqual({ role: 'member' }));
    expect(screen.queryByText(/confirm role elevation/i)).not.toBeInTheDocument();
  });
});
