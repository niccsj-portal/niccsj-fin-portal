import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { CategoriesPage } from '@/routes/admin/CategoriesPage';
import { makeAppClient } from './helpers/fakeDb';

const categoryRows = [
  { id: 'c1', name: 'Offertory', type: 'income', parent_id: null, is_active: true },
  { id: 'c2', name: 'Household Dues (legacy)', type: 'income', parent_id: null, is_active: true },
  { id: 'c3', name: 'Utilities', type: 'expense', parent_id: null, is_active: true },
];

function setup() {
  const ctx = makeAppClient({
    role: 'admin',
    tables: {
      users: { single: { role: 'admin', member_id: null } },
      categories: { rows: categoryRows },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={ctx.client}>
        <CategoriesPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return ctx;
}

describe('CategoriesPage', () => {
  it('groups categories and flags the legacy dues for phase-out', async () => {
    setup();
    expect(await screen.findByText('Offertory')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /income categories/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /expense categories/i })).toBeInTheDocument();
    expect(screen.getByText(/legacy — phasing out/i)).toBeInTheDocument();
  });

  it('deactivates (phases out) a category', async () => {
    const { calls } = setup();
    await screen.findByText('Household Dues (legacy)');
    const buttons = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(calls.updated).toEqual({ is_active: false }));
  });

  it('creates a new category', async () => {
    const { client, calls } = makeAppClient({
      role: 'admin',
      tables: {
        users: { single: { role: 'admin', member_id: null } },
        categories: { rows: categoryRows, single: { id: 'c9', name: 'Youth Ministry', type: 'income', parent_id: null, is_active: true } },
      },
    });
    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <CategoriesPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByText('Offertory');
    fireEvent.change(screen.getByLabelText(/new category name/i), {
      target: { value: 'Youth Ministry' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add category/i }));
    await waitFor(() =>
      expect(calls.inserted).toEqual({ name: 'Youth Ministry', type: 'income', parent_id: null }),
    );
  });
});
