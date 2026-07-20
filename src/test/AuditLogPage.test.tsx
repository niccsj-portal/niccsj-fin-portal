import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { AuditLogPage } from '@/routes/admin/AuditLogPage';
import { makeAppClient } from './helpers/fakeDb';

const auditRows = [
  {
    id: 1,
    user_id: 'u1',
    action: 'update',
    entity: 'members',
    entity_id: 'm1',
    before: null,
    after: null,
    occurred_at: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 2,
    user_id: null,
    action: 'insert',
    entity: 'contributions',
    entity_id: 'c1',
    before: null,
    after: null,
    occurred_at: '2026-06-02T10:00:00.000Z',
  },
];

const users = [
  { id: 'u1', email: 'fs@example.com', role: 'fin_secretary', member_id: null, is_active: true },
];

function setup() {
  const ctx = makeAppClient({
    role: 'admin',
    tables: {
      users: { rows: users, single: { role: 'admin', member_id: null } },
      audit_log: { rows: auditRows },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={ctx.client}>
        <AuditLogPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return ctx;
}

describe('AuditLogPage', () => {
  it('lists audit entries and resolves the actor email', async () => {
    setup();
    // Scope to table cells — entity names also appear as filter <option>s.
    expect(await screen.findByRole('cell', { name: 'members' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'contributions' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'fs@example.com' })).toBeInTheDocument();
    // Null user_id renders as "System".
    expect(screen.getByRole('cell', { name: 'System' })).toBeInTheDocument();
  });

  it('re-queries with an entity filter', async () => {
    const { calls } = setup();
    await screen.findByText('members');
    fireEvent.change(screen.getByLabelText(/^entity$/i), { target: { value: 'expenses' } });
    await waitFor(() => expect(calls.filters).toContainEqual(['entity', 'expenses']));
  });
});
