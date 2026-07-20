import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { SubAccountAssignmentPage } from '@/routes/admin/SubAccountAssignmentPage';
import { makeAppClient } from './helpers/fakeDb';

const subAccounts = [
  { id: 'sa1', slug: 'cmo', name: 'CMO', description: null, is_active: true },
  { id: 'sa2', slug: 'cwo', name: 'CWO', description: null, is_active: true },
];

const users = [
  { id: 'u1', email: 'group1@example.com', role: 'group_fin_sec', member_id: null, is_active: true },
  { id: 'u2', email: 'group2@example.com', role: 'group_fin_sec', member_id: null, is_active: true },
  { id: 'admin', email: 'admin@example.com', role: 'admin', member_id: null, is_active: true },
];

const assignments = [{ id: 'a1', sub_account_id: 'sa1', user_id: 'u1', created_at: '2026-01-01' }];

function setup(tableOverrides = {}) {
  const ctx = makeAppClient({
    role: 'admin',
    tables: {
      users: { rows: users, single: { role: 'admin', member_id: null } },
      sub_accounts: { rows: subAccounts },
      sub_account_users: { rows: assignments },
      ...tableOverrides,
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={ctx.client}>
        <SubAccountAssignmentPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return ctx;
}

describe('SubAccountAssignmentPage', () => {
  it('lists sub-accounts and their assigned managers', async () => {
    setup();
    expect(await screen.findByText('CMO')).toBeInTheDocument();
    expect(screen.getByText('CWO')).toBeInTheDocument();
    // group1 is assigned to CMO — exactly one Remove control exists.
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    expect(screen.getAllByText('group1@example.com').length).toBeGreaterThan(0);
  });

  it('assigns a Group Financial Secretary to a sub-account', async () => {
    const { calls } = setup();
    await screen.findByText('CWO');
    // Assign to CWO (sa2), which has no assignment yet.
    const select = screen.getByLabelText(/assign a group financial secretary/i, {
      selector: '#assign-sa2',
    });
    fireEvent.change(select, { target: { value: 'u2' } });
    const assignButtons = screen.getAllByRole('button', { name: /^assign$/i });
    fireEvent.click(assignButtons[1]);
    await waitFor(() =>
      expect(calls.inserted).toEqual({ sub_account_id: 'sa2', user_id: 'u2' }),
    );
  });

  it('removes an assignment', async () => {
    const { calls } = setup();
    await screen.findByText('CMO');
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    await waitFor(() => expect(calls.filters).toContainEqual(['id', 'a1']));
  });

  it('creates a new sub-account', async () => {
    const { calls } = setup({ sub_accounts: { rows: subAccounts, single: { id: 'sa9', slug: 'youth', name: 'Youth Group', description: null, is_active: true } } });
    await screen.findByText('CMO');
    fireEvent.change(screen.getByLabelText(/new sub-account name/i), { target: { value: 'Youth Group' } });
    fireEvent.change(screen.getByLabelText(/^code$/i), { target: { value: 'youth' } });
    fireEvent.click(screen.getByRole('button', { name: /add sub-account/i }));
    await waitFor(() =>
      expect(calls.inserted).toEqual({ slug: 'youth', name: 'Youth Group', description: null }),
    );
  });
});
