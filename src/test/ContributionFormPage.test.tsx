import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ContributionFormPage } from '@/routes/contributions/ContributionFormPage';
import { makeAppClient } from './helpers/fakeDb';

type FakeTables = Record<
  string,
  { rows?: unknown[]; single?: unknown; error?: { message: string } | null }
>;

function baseTables(extra: FakeTables = {}) {
  return {
    households: { rows: [{ id: 'h1', name: 'Okeke' }] },
    members: {
      rows: [{ id: 'm1', household_id: 'h1', first_name: 'Ada', last_name: 'Okeke' }],
    },
    categories: {
      rows: [
        { id: 'cmo', name: 'CMO Dues', type: 'income', parent_id: null, is_active: true },
        { id: 'don', name: 'Donations', type: 'income', parent_id: null, is_active: true },
      ],
      single: { id: 'don2', name: 'Funeral', type: 'income', parent_id: 'don', is_active: true },
    },
    ...extra,
  };
}

function renderForm(path: string, client: ReturnType<typeof makeAppClient>['client']) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/contributions/new" element={<ContributionFormPage />} />
          <Route path="/contributions/:id" element={<ContributionFormPage />} />
          <Route path="/contributions" element={<div>Ledger landing</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ContributionFormPage — create (stories 4.2/4.8)', () => {
  it('defaults the date to today and focuses the amount field', async () => {
    const { client } = makeAppClient({ role: 'fin_secretary', tables: baseTables() });
    renderForm('/contributions/new', client);
    const date = (await screen.findByLabelText(/^date$/i)) as HTMLInputElement;
    expect(date.value).toBe(new Date().toISOString().slice(0, 10));
    expect(screen.getByLabelText(/amount/i)).toHaveFocus();
  });

  it('validates required fields before saving', async () => {
    const { client } = makeAppClient({ role: 'fin_secretary', tables: baseTables() });
    renderForm('/contributions/new', client);
    await screen.findByLabelText(/household/i);
    fireEvent.click(screen.getByRole('button', { name: /save contribution/i }));
    expect(await screen.findByText(/select a household/i)).toBeInTheDocument();
  });

  it('creates a contribution and returns to the ledger', async () => {
    const { client, calls } = makeAppClient({
      role: 'fin_secretary',
      tables: baseTables({ contributions: { single: { id: 'new1' } } }),
    });
    renderForm('/contributions/new', client);
    await screen.findByLabelText(/household/i);
    fireEvent.change(screen.getByLabelText(/household/i), { target: { value: 'h1' } });
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'cmo' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /save contribution/i }));
    expect(await screen.findByText(/ledger landing/i)).toBeInTheDocument();
    expect(calls.inserted).toMatchObject({ household_id: 'h1', category_id: 'cmo', amount: 120 });
  });

  it('lets a recorder add a donation purpose inline (story 4.3)', async () => {
    const { client, calls } = makeAppClient({
      role: 'fin_secretary',
      tables: baseTables(),
    });
    renderForm('/contributions/new', client);
    await screen.findByLabelText(/household/i);
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'don' } });
    const purpose = await screen.findByLabelText(/add a donation purpose/i);
    fireEvent.change(purpose, { target: { value: 'Funeral' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    await screen.findByRole('option', { name: /donations — funeral/i });
    expect(calls.inserted).toMatchObject({ name: 'Funeral', parent_id: 'don', type: 'income' });
  });
});

describe('ContributionFormPage — edit/correct (story 4.5)', () => {
  const existing = {
    id: 'c1',
    member_id: 'm1',
    household_id: 'h1',
    category_id: 'cmo',
    amount: 50,
    contribution_date: '2025-01-15',
    payment_method: 'cash',
    notes: null,
    correction_reason: null,
    is_active: true,
  };

  it('requires a correction reason before saving an edit', async () => {
    const { client } = makeAppClient({
      role: 'fin_secretary',
      tables: baseTables({ contributions: { single: existing } }),
    });
    renderForm('/contributions/c1', client);
    await screen.findByText(/correct contribution/i);
    fireEvent.click(screen.getByRole('button', { name: /save correction/i }));
    expect(await screen.findByText(/please give a reason for this correction/i)).toBeInTheDocument();
  });

  it('saves a correction with the audited reason', async () => {
    const { client, calls } = makeAppClient({
      role: 'fin_secretary',
      tables: baseTables({ contributions: { single: existing } }),
    });
    renderForm('/contributions/c1', client);
    await screen.findByText(/correct contribution/i);
    fireEvent.change(screen.getByLabelText(/reason for correction/i), {
      target: { value: 'Wrong amount entered' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save correction/i }));
    expect(await screen.findByText(/ledger landing/i)).toBeInTheDocument();
    expect(calls.updated).toMatchObject({ correction_reason: 'Wrong amount entered' });
  });
});
