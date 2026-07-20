import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { RequireRole } from '@/components/auth/RequireRole';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { canEditMembers, type AppRole } from '@/lib/auth/roles';
import { makeAppClient } from './helpers/fakeDb';

/**
 * Story 2.8 — UI permission matrix for member-editor routes. Mirrors the RLS
 * `is_member_editor()` predicate (migration 20260626101000): only
 * fin_secretary, chaplain, and admin may reach create/edit/import routes.
 * RLS stays authoritative; this guards the presentation layer.
 */
const EDITORS: AppRole[] = ['fin_secretary', 'chaplain', 'admin'];
const NON_EDITORS: AppRole[] = ['treasurer', 'group_fin_sec', 'finance_council', 'member'];

function renderGuarded(role: AppRole) {
  const { client } = makeAppClient({ role, tables: {} });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <RequireRole allow={canEditMembers}>
          <div>Edit member form</div>
        </RequireRole>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('member-editor route permissions (story 2.8)', () => {
  it.each(EDITORS)('allows %s to reach the member editor', async (role) => {
    renderGuarded(role);
    expect(await screen.findByText('Edit member form')).toBeInTheDocument();
  });

  it.each(NON_EDITORS)('blocks %s with Access denied', async (role) => {
    renderGuarded(role);
    await waitFor(() => expect(screen.getByText('Access denied')).toBeInTheDocument());
    expect(screen.queryByText('Edit member form')).not.toBeInTheDocument();
  });
});
