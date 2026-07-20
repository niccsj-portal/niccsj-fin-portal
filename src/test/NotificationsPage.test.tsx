import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { NotificationsPage } from '@/routes/expenses/NotificationsPage';
import { makeAppClient } from './helpers/fakeDb';

const yr = new Date().getFullYear();

function tables() {
  return {
    expense_notifications: {
      rows: [
        {
          id: 'n1',
          expense_id: 'e1',
          notified_user_id: 'u1',
          is_read: false,
          notified_at: `${yr}-10-10T12:00:00Z`,
        },
        {
          id: 'n2',
          expense_id: 'e2',
          notified_user_id: 'u1',
          is_read: true,
          notified_at: `${yr}-10-09T12:00:00Z`,
        },
      ],
    },
    expenses: {
      rows: [
        {
          id: 'e1',
          category_id: 'util',
          payee: 'City Power',
          description: null,
          expense_date: `${yr}-10-10`,
          amount: 120,
          status: 'pending',
          receipt_path: null,
          rejection_reason: null,
          is_active: true,
        },
        {
          id: 'e2',
          category_id: 'hall',
          payee: 'Parish Hall LLC',
          description: null,
          expense_date: `${yr}-10-08`,
          amount: 500,
          status: 'approved',
          receipt_path: null,
          rejection_reason: null,
          is_active: true,
        },
      ],
    },
  };
}

function renderFeed() {
  const harness = makeAppClient({ role: 'finance_council', tables: tables() });
  render(
    <MemoryRouter>
      <AuthProvider client={harness.client}>
        <NotificationsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return harness;
}

describe('NotificationsPage (story 5.7)', () => {
  it('lists notifications with the related expense summary', async () => {
    renderFeed();
    expect(await screen.findByText('City Power')).toBeInTheDocument();
    expect(screen.getByText('Parish Hall LLC')).toBeInTheDocument();
    expect(screen.getByText(/\$120\.00/)).toBeInTheDocument();
  });

  it('offers Mark read only on unread notifications', async () => {
    renderFeed();
    await screen.findByText('City Power');
    // One unread (n1) → exactly one Mark read button.
    expect(screen.getAllByRole('button', { name: /mark read/i })).toHaveLength(1);
  });

  it('marks a notification read and updates the row', async () => {
    const { calls } = renderFeed();
    await screen.findByText('City Power');
    fireEvent.click(screen.getByRole('button', { name: /mark read/i }));

    await waitFor(() => {
      expect(calls.updated).toMatchObject({ is_read: true });
    });
    // After marking read, no unread Mark read button remains.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /mark read/i })).not.toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no notifications', async () => {
    const { client } = makeAppClient({
      role: 'finance_council',
      tables: { expense_notifications: { rows: [] }, expenses: { rows: [] } },
    });
    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <NotificationsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });
});
