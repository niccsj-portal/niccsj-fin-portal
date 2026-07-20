import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ExpensesLedgerPage } from '@/routes/expenses/ExpensesLedgerPage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

function tables() {
  return {
    expenses: {
      rows: [
        {
          id: 'e1',
          category_id: 'hall',
          payee: 'Parish Hall LLC',
          description: 'October rental',
          expense_date: `${yr}-10-02`,
          amount: 500,
          status: 'approved',
          receipt_path: null,
          rejection_reason: null,
          decided_at: `${yr}-10-03T15:30:00Z`,
          is_active: true,
        },
        {
          id: 'e2',
          category_id: 'util',
          payee: 'City Power',
          description: null,
          expense_date: `${yr}-10-05`,
          amount: 120,
          status: 'pending',
          receipt_path: null,
          rejection_reason: null,
          decided_at: null,
          is_active: true,
        },
        {
          id: 'e3',
          category_id: 'misc',
          payee: 'Sundry Vendor',
          description: null,
          expense_date: `${yr}-09-30`,
          amount: 40,
          status: 'rejected',
          receipt_path: null,
          rejection_reason: 'Out of policy',
          decided_at: `${yr}-10-01T09:00:00Z`,
          is_active: true,
        },
      ],
    },
    categories: {
      rows: [
        { id: 'hall', name: 'Hall / Venue Rental', type: 'expense', parent_id: null, is_active: true },
        { id: 'util', name: 'Utilities', type: 'expense', parent_id: null, is_active: true },
        { id: 'misc', name: 'Miscellaneous', type: 'expense', parent_id: null, is_active: true },
      ],
    },
  };
}

function renderLedger(role: string) {
  const { client } = makeAppClient({ role, tables: tables() });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <ExpensesLedgerPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ExpensesLedgerPage (story 5.5)', () => {
  it('lists every expense with a running total', async () => {
    renderLedger('treasurer');
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('Parish Hall LLC')).toBeInTheDocument();
    expect(table.getByText('City Power')).toBeInTheDocument();
    expect(table.getByText('$660.00')).toBeInTheDocument();
  });

  it('surfaces the rejection reason for a rejected expense', async () => {
    renderLedger('treasurer');
    await screen.findByRole('table');
    expect(screen.getByText(/out of policy/i)).toBeInTheDocument();
  });

  it('offers the record action to a treasurer', async () => {
    renderLedger('treasurer');
    expect(await screen.findByRole('link', { name: /record expense/i })).toBeInTheDocument();
  });

  it('hides the record action from a read-only finance secretary', async () => {
    renderLedger('fin_secretary');
    await screen.findByRole('table');
    expect(screen.queryByRole('link', { name: /record expense/i })).not.toBeInTheDocument();
  });

  it('shows the approval-queue link with a pending count to a chaplain', async () => {
    renderLedger('chaplain');
    await screen.findByRole('table');
    const link = screen.getByRole('link', { name: /approval queue/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent(/\(1\)/);
  });

  it('opens a read-only detail dialog for an approved expense (fix: decided items are viewable)', async () => {
    renderLedger('treasurer');
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: /view details for parish hall llc/i }));
    const dialog = await screen.findByRole('dialog');
    const view = within(dialog);
    expect(view.getByText(/expense details/i)).toBeInTheDocument();
    expect(view.getByText(/october rental/i)).toBeInTheDocument();
    expect(view.getByText(/decided/i)).toBeInTheDocument();
  });

  it('shows the full rejection reason and decided-at in the detail dialog for a rejected expense', async () => {
    renderLedger('treasurer');
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: /view details for sundry vendor/i }));
    const view = within(await screen.findByRole('dialog'));
    expect(view.getByText(/reason/i)).toBeInTheDocument();
    expect(view.getByText(/out of policy/i)).toBeInTheDocument();
    expect(view.getByText(/decided/i)).toBeInTheDocument();
  });

  it('omits Decided and Reason rows for a pending expense', async () => {
    renderLedger('treasurer');
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: /view details for city power/i }));
    const view = within(await screen.findByRole('dialog'));
    expect(view.queryByText(/decided/i)).not.toBeInTheDocument();
    expect(view.queryByText(/^reason$/i)).not.toBeInTheDocument();
  });
});
