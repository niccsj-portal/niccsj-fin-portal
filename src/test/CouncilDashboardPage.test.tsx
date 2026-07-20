import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { CouncilDashboardPage } from '@/routes/reports/CouncilDashboardPage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

function makeClient() {
  return makeAppClient({
    role: 'finance_council',
    rpcResults: {
      report_income_by_category: [{ category_id: 'dues', category_name: 'Annual Dues', total: 750 }],
      report_income_monthly: [
        { month: 3, total: 500 },
        { month: 6, total: 250 },
      ],
      report_participation: [{ contributing: 2, total: 4 }],
    },
    tables: {
      expenses: {
        rows: [
          { id: 'e1', category_id: 'hall', payee: 'Parish Hall LLC', description: null, expense_date: `${yr}-03-12`, amount: 200, status: 'approved', receipt_path: null, rejection_reason: null, is_active: true },
        ],
      },
      sub_accounts: {
        rows: [
          { id: 's1', slug: 'cmo', name: "Men's Group", description: null, is_active: true, created_at: '', updated_at: '' },
        ],
      },
      sub_account_reports: {
        rows: [
          { id: 'r1', sub_account_id: 's1', period_year: yr, period_month: 3, opening_balance: 100, total_income: 200, total_expense: 50, closing_balance: 250, status: 'submitted', submitted_by: null, submitted_at: '', acknowledged_by: null, acknowledged_at: null, created_at: '' },
        ],
      },
    },
  }).client;
}

function renderCouncil() {
  render(
    <MemoryRouter>
      <AuthProvider client={makeClient()}>
        <CouncilDashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CouncilDashboardPage (stories 7.2 + 7.5)', () => {
  it('shows a persistent aggregate-only banner', async () => {
    renderCouncil();
    expect(await screen.findByText(/aggregate figures only/i)).toBeInTheDocument();
    expect(screen.getByText(/never displays per-member or per-household detail/i)).toBeInTheDocument();
  });

  it('renders aggregate income from the RPC (no per-member rows)', async () => {
    renderCouncil();
    expect((await screen.findAllByText('$750.00')).length).toBeGreaterThan(0);
  });

  it('shows the participation rate as an aggregate ratio', async () => {
    renderCouncil();
    await screen.findAllByText('$750.00');
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/2 of 4 households/i)).toBeInTheDocument();
  });

  it('shows the CMO/CWO rollup (opening/income/expense/closing) — no drill-down', async () => {
    renderCouncil();
    await screen.findAllByText('$750.00');
    const row = screen.getByText("Men's Group").closest('tr');
    const cells = within(row as HTMLElement);
    expect(cells.getByText('$100.00')).toBeInTheDocument(); // opening
    expect(cells.getByText('$250.00')).toBeInTheDocument(); // closing
  });
});
