import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ReportsPage } from '@/routes/reports/ReportsPage';
import {
  canAccessNav,
  canEditMembers,
  canRecordContributions,
  canViewAllContributions,
} from '@/lib/auth/roles';
import { makeAppClient } from './helpers/fakeDb';

/**
 * Story 7.6 — permissions QA. The Finance Council must never reach per-member
 * screens or receive per-member data; the reports route must branch each role to
 * the right (correctly-scoped) dashboard. RLS + the aggregate-only RPCs are the
 * real boundary; these assertions cover the presentation gate that mirrors it.
 */

function renderReports(role: string) {
  const { client } = makeAppClient({
    role,
    rpcResults: {
      report_income_by_category: [],
      report_income_monthly: [],
      report_participation: [{ contributing: 0, total: 0 }],
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <ReportsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('reports role branching (story 7.6)', () => {
  it('routes the Finance Council to the aggregate-only oversight dashboard', async () => {
    renderReports('finance_council');
    expect(await screen.findByText(/finance council oversight/i)).toBeInTheDocument();
    expect(screen.getByText(/aggregate figures only/i)).toBeInTheDocument();
    // The Treasurer's detail-bearing dashboard heading must NOT appear.
    expect(screen.queryByRole('heading', { name: /^finance dashboard$/i })).not.toBeInTheDocument();
  });

  it('routes the Treasurer to the finance dashboard', async () => {
    renderReports('treasurer');
    expect(await screen.findByRole('heading', { name: /finance dashboard/i })).toBeInTheDocument();
  });

  it('points a Group Financial Secretary to their Sub-accounts page', () => {
    renderReports('group_fin_sec');
    expect(screen.getByText(/your reporting lives on the sub-accounts page/i)).toBeInTheDocument();
  });
});

describe('Finance Council is fenced out of per-member surfaces (story 7.6)', () => {
  it('cannot reach the members or households screens', () => {
    expect(canAccessNav('finance_council', 'members')).toBe(false);
    expect(canAccessNav('finance_council', 'households')).toBe(false);
  });

  it('cannot record contributions or edit members', () => {
    expect(canRecordContributions('finance_council')).toBe(false);
    expect(canEditMembers('finance_council')).toBe(false);
  });

  it('is not a per-member contribution reader (aggregate-only)', () => {
    expect(canViewAllContributions('finance_council')).toBe(false);
  });
});
