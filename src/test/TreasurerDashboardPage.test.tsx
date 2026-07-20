import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { TreasurerDashboardPage } from '@/routes/reports/TreasurerDashboardPage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

function tables() {
  return {
    contributions: {
      rows: [
        { id: 'c1', member_id: null, household_id: 'h1', contribution_date: `${yr}-03-05`, amount: 500, category_id: 'dues', payment_method: 'cash', notes: null, correction_reason: null, is_active: true },
        { id: 'c2', member_id: null, household_id: 'h2', contribution_date: `${yr}-06-10`, amount: 250, category_id: 'dues', payment_method: 'cash', notes: null, correction_reason: null, is_active: true },
      ],
    },
    expenses: {
      rows: [
        { id: 'e1', category_id: 'hall', payee: 'Parish Hall LLC', description: null, expense_date: `${yr}-03-12`, amount: 200, status: 'approved', receipt_path: null, rejection_reason: null, is_active: true },
        { id: 'e2', category_id: 'util', payee: 'City Power', description: null, expense_date: `${yr}-06-15`, amount: 999, status: 'pending', receipt_path: null, rejection_reason: null, is_active: true },
      ],
    },
    categories: {
      rows: [
        { id: 'dues', name: 'Annual Dues', type: 'income', parent_id: null, is_active: true },
        { id: 'hall', name: 'Hall Rental', type: 'expense', parent_id: null, is_active: true },
        { id: 'util', name: 'Utilities', type: 'expense', parent_id: null, is_active: true },
      ],
    },
  };
}

function renderDashboard(role = 'treasurer') {
  const { client } = makeAppClient({ role, tables: tables() });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <TreasurerDashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('TreasurerDashboardPage (story 7.1)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:report');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.print = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows aggregate KPIs from the ledgers (income, expense, net, pending)', async () => {
    renderDashboard();
    expect((await screen.findAllByText('$750.00')).length).toBeGreaterThan(0); // income
    expect(screen.getByText('$550.00')).toBeInTheDocument(); // net (unique)
    const pendingCard = screen.getByText('Pending approvals').closest('div');
    expect(within(pendingCard as HTMLElement).getByText('1')).toBeInTheDocument();
  });

  it('lists the period expenses with payee and status', async () => {
    renderDashboard();
    await screen.findAllByText('$750.00');
    expect(screen.getByText('Parish Hall LLC')).toBeInTheDocument();
    expect(screen.getByText('City Power')).toBeInTheDocument();
  });

  it('exports the current view to CSV', async () => {
    renderDashboard();
    await screen.findAllByText('$750.00');
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('exports to PDF via the browser print dialog', async () => {
    renderDashboard();
    await screen.findAllByText('$750.00');
    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
