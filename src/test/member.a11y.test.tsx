import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { MemberDashboard } from '@/routes/member/MemberDashboard';
import { MemberProfilePage } from '@/routes/member/MemberProfilePage';
import { FamilyContributionsPage } from '@/routes/member/FamilyContributionsPage';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

/**
 * Story 3.5 — accessibility pass for the member self-service surfaces. Each
 * page must expose a single top-level heading, name every interactive control,
 * and label its lists/regions so assistive tech can navigate them (UX §8,
 * graphics §8.6 / §12).
 */

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

const household: HouseholdRow = {
  id: 'h1',
  name: 'Okafor Family',
  primary_member_id: 'm1',
  is_active: true,
  opening_balance: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderMember(ui: ReactNode) {
  const app = makeAppClient({
    role: 'member',
    memberId: 'm1',
    tables: {
      members: { single: me, rows: [me] },
      households: { rows: [household] },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={app.client}>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

describe('Member self-service accessibility', () => {
  it('dashboard exposes one heading, a named categories list and a named CTA', async () => {
    renderMember(<MemberDashboard />);
    await screen.findByText(/Welcome, Ada Okafor/);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('list', { name: /contribution categories/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /annual family summary/i }),
    ).toBeInTheDocument();
  });

  it('profile labels every contact control and names its regions', async () => {
    renderMember(<MemberProfilePage />);
    await screen.findByText('Okafor Family');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    // Every editable control is reachable by its accessible label.
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.test');
    expect(screen.getByLabelText('Phone')).toHaveValue('555-0100');
    expect(screen.getByLabelText('Address')).toHaveValue('1 Grace St');

    // The edit form and household list carry accessible names.
    const form = screen.getByRole('form', { name: /edit my contact details/i });
    expect(within(form).getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: /household members/i }),
    ).toBeInTheDocument();
  });

  it('contributions labels its year control and uses one heading', async () => {
    renderMember(<FamilyContributionsPage />);

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1),
    );
    const yearSelect = screen.getByLabelText('Year');
    expect(yearSelect.tagName).toBe('SELECT');
  });
});
