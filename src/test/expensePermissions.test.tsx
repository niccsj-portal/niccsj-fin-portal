import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { RequireRole } from '@/components/auth/RequireRole';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { canApproveExpenses, canRecordExpenses, type AppRole } from '@/lib/auth/roles';
import { makeAppClient } from './helpers/fakeDb';

/**
 * Story 5.9 — permission QA for the expense workflow (PRD §7). Mirrors the
 * RequireRole gating used in App.tsx so the presentation-layer boundary stays
 * aligned with the role helpers (RLS + the Edge Functions are the real gate).
 */
function renderGate(role: string, gate: 'record' | 'approve' | 'view') {
  const { client } = makeAppClient({ role });
  const allow = gate === 'record' ? canRecordExpenses : gate === 'approve' ? canApproveExpenses : undefined;
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <RequireRole navKey={gate === 'view' ? 'expenses' : undefined} allow={allow}>
          <p>protected content</p>
        </RequireRole>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function expectAllowed() {
  expect(await screen.findByText(/protected content/i)).toBeInTheDocument();
}

async function expectDenied() {
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  });
  expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
}

describe('Expense workflow permissions (story 5.9, PRD §7)', () => {
  describe('record expense route (/expenses/new)', () => {
    it.each<AppRole>(['treasurer', 'admin'])('allows %s', async (role) => {
      renderGate(role, 'record');
      await expectAllowed();
    });

    it.each<AppRole>(['fin_secretary', 'chaplain', 'finance_council', 'member'])(
      'denies %s',
      async (role) => {
        renderGate(role, 'record');
        await expectDenied();
      },
    );
  });

  describe('approval route (/expenses/approvals)', () => {
    it.each<AppRole>(['chaplain', 'admin'])('allows %s', async (role) => {
      renderGate(role, 'approve');
      await expectAllowed();
    });

    it.each<AppRole>(['fin_secretary', 'treasurer', 'finance_council', 'member'])(
      'denies %s',
      async (role) => {
        renderGate(role, 'approve');
        await expectDenied();
      },
    );
  });

  describe('expense ledger route (/expenses)', () => {
    it.each<AppRole>(['fin_secretary', 'treasurer', 'chaplain', 'finance_council', 'admin'])(
      'allows the notified role %s',
      async (role) => {
        renderGate(role, 'view');
        await expectAllowed();
      },
    );

    it('denies a member', async () => {
      renderGate('member', 'view');
      await expectDenied();
    });
  });
});
