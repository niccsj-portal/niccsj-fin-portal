import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ApprovalQueuePage } from '@/routes/expenses/ApprovalQueuePage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

function tables() {
  return {
    expenses: {
      rows: [
        {
          id: 'newer',
          category_id: 'util',
          payee: 'City Power',
          description: 'Lights',
          expense_date: `${yr}-10-10`,
          amount: 120,
          status: 'pending',
          receipt_path: null,
          rejection_reason: null,
          is_active: true,
        },
        {
          id: 'older',
          category_id: 'hall',
          payee: 'Parish Hall LLC',
          description: 'Rental',
          expense_date: `${yr}-09-01`,
          amount: 500,
          status: 'pending',
          receipt_path: null,
          rejection_reason: null,
          is_active: true,
        },
      ],
    },
    categories: {
      rows: [
        { id: 'hall', name: 'Hall / Venue Rental', type: 'expense', parent_id: null, is_active: true },
        { id: 'util', name: 'Utilities', type: 'expense', parent_id: null, is_active: true },
      ],
    },
  };
}

function renderQueue() {
  const harness = makeAppClient({ role: 'chaplain', tables: tables() });
  render(
    <MemoryRouter>
      <AuthProvider client={harness.client}>
        <ApprovalQueuePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return harness;
}

describe('ApprovalQueuePage (stories 5.6 + 5.4)', () => {
  it('orders pending expenses oldest first', async () => {
    renderQueue();
    const table = within(await screen.findByRole('table'));
    const rows = table.getAllByRole('row');
    // rows[0] is the header; rows[1] is the first body row.
    expect(within(rows[1]).getByText('Parish Hall LLC')).toBeInTheDocument();
    expect(within(rows[2]).getByText('City Power')).toBeInTheDocument();
  });

  it('opens a detail dialog and approves through the Edge Function', async () => {
    const { invoke } = renderQueue();
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('button', { name: /review/i })[0]);

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/review expense/i)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('approve-expense', expect.anything());
    });
  });

  it('requires a reason before rejecting', async () => {
    const { invoke } = renderQueue();
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('button', { name: /review/i })[0]);

    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /reject/i }));

    expect(await dialog.findByText(/give a reason for rejecting/i)).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith('reject-expense', expect.anything());
  });

  it('rejects with a reason through the Edge Function', async () => {
    const { invoke } = renderQueue();
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('button', { name: /review/i })[0]);

    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(dialog.getByLabelText(/rejection reason/i), {
      target: { value: 'Out of policy' },
    });
    fireEvent.click(dialog.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('reject-expense', expect.anything());
    });
  });
});
