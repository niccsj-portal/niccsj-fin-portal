import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { LoginPage } from '@/routes/LoginPage';
import { DashboardPage } from '@/routes/DashboardPage';
import { AdminConsolePage } from '@/routes/admin/AdminConsolePage';
import { AdminUsersPage } from '@/routes/admin/AdminUsersPage';
import { PermissionMatrixPage } from '@/routes/admin/PermissionMatrixPage';
import { AuditLogPage } from '@/routes/admin/AuditLogPage';
import { HealthPage } from '@/routes/admin/HealthPage';
import { CategoriesPage } from '@/routes/admin/CategoriesPage';
import { SubAccountAssignmentPage } from '@/routes/admin/SubAccountAssignmentPage';
import { makeAppClient } from './helpers/fakeDb';
import { makeFakeSupabase } from './helpers/fakeSupabase';
import { findAxeViolations, summarizeViolations } from './helpers/axe';

/**
 * Sprint 9 story 9.8 — automated accessibility gate over the key pages,
 * including the whole Admin Console surface. Complements the manual Lighthouse
 * + axe DevTools pass. Assertions target WCAG 2.x A & AA rules (see
 * ./helpers/axe). Each page is wrapped in a <main> landmark to mirror the
 * authenticated shell it renders inside.
 */

const users = [
  { id: 'u1', email: 'chidi@example.com', role: 'member', member_id: null, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'u2', email: 'ngozi@example.com', role: 'group_fin_sec', member_id: null, is_active: true, created_at: '2026-01-02', updated_at: '2026-01-02' },
];

const member = {
  id: 'm1', member_number: 1, first_name: 'Ada', last_name: 'Okafor',
  email: 'ada@example.test', phone: '555-0100', address: '1 Grace St',
  joined_date: '2026-01-01', household_id: 'h1', role_in_household: 'head',
  baptism_status: 'baptized', is_active: true,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
const household = {
  id: 'h1', name: 'Okafor Family', primary_member_id: 'm1', is_active: true,
  opening_balance: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

function renderInShell(ui: ReactNode, client: ReturnType<typeof makeAppClient>['client']) {
  return render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <main>{ui}</main>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function expectNoViolations() {
  const violations = await findAxeViolations(document.body);
  expect(summarizeViolations(violations)).toEqual([]);
}

describe('Accessibility (axe) — key pages (story 9.8)', () => {
  it('Login page has no WCAG A/AA violations', async () => {
    const { client } = makeFakeSupabase();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider client={client}>
          <main>
            <LoginPage />
          </main>
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /sign in/i });
    await expectNoViolations();
  });

  it('Member dashboard has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({
      role: 'member',
      memberId: 'm1',
      tables: { members: { single: member, rows: [member] }, households: { rows: [household] } },
    });
    renderInShell(<DashboardPage />, client);
    await screen.findByText(/Welcome, Ada Okafor/);
    await expectNoViolations();
  });

  it('Admin Console hub has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({ role: 'admin', tables: { users: { single: { role: 'admin', member_id: null } } } });
    renderInShell(<AdminConsolePage />, client);
    await screen.findByRole('heading', { name: /admin console/i });
    await expectNoViolations();
  });

  it('Admin Users & roles page has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: { users: { rows: users, single: { role: 'admin', member_id: null } } },
    });
    renderInShell(<AdminUsersPage />, client);
    await screen.findByText('chidi@example.com');
    await expectNoViolations();
  });

  it('Role-permission matrix has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({ role: 'admin', tables: { users: { single: { role: 'admin', member_id: null } } } });
    renderInShell(<PermissionMatrixPage />, client);
    await screen.findByRole('heading', { name: /role-permission matrix/i });
    await expectNoViolations();
  });

  it('System health page has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: { users: { single: { role: 'admin', member_id: null } }, client_errors: { count: 2 } },
    });
    renderInShell(<HealthPage />, client);
    await screen.findByRole('heading', { name: /system health/i });
    await expectNoViolations();
  });

  it('Categories page has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: {
        users: { single: { role: 'admin', member_id: null } },
        categories: { rows: [{ id: 'c1', name: 'Offertory', type: 'income', parent_id: null, is_active: true }] },
      },
    });
    renderInShell(<CategoriesPage />, client);
    await screen.findByText('Offertory');
    await expectNoViolations();
  });

  it('Sub-account assignment page has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: {
        users: { rows: users, single: { role: 'admin', member_id: null } },
        sub_accounts: { rows: [{ id: 'sa1', slug: 'cmo', name: 'CMO', description: null, is_active: true }] },
        sub_account_users: { rows: [] },
      },
    });
    renderInShell(<SubAccountAssignmentPage />, client);
    await screen.findByText('CMO');
    await expectNoViolations();
  });

  it('Audit log page has no WCAG A/AA violations', async () => {
    const { client } = makeAppClient({
      role: 'admin',
      tables: {
        users: { rows: users, single: { role: 'admin', member_id: null } },
        audit_log: {
          rows: [
            { id: 1, user_id: 'u1', action: 'update', entity: 'members', entity_id: 'm1', before: null, after: null, occurred_at: '2026-06-01T10:00:00.000Z' },
          ],
        },
      },
    });
    renderInShell(<AuditLogPage />, client);
    await screen.findByRole('heading', { name: /audit log/i });
    await expectNoViolations();
  });
});
