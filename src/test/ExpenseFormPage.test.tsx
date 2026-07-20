import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ExpenseFormPage } from '@/routes/expenses/ExpenseFormPage';
import { makeAppClient } from './helpers/fakeDb';

function tables() {
  return {
    categories: {
      rows: [
        { id: 'hall', name: 'Hall / Venue Rental', type: 'expense', parent_id: null, is_active: true },
        { id: 'util', name: 'Utilities', type: 'expense', parent_id: null, is_active: true },
      ],
    },
  };
}

function renderForm() {
  const harness = makeAppClient({ role: 'treasurer', tables: tables() });
  render(
    <MemoryRouter initialEntries={['/expenses/new']}>
      <AuthProvider client={harness.client}>
        <Routes>
          <Route path="/expenses/new" element={<ExpenseFormPage />} />
          <Route path="/expenses" element={<div>Ledger landing</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return harness;
}

describe('ExpenseFormPage (story 5.5)', () => {
  it('defaults the date to today and lists expense categories', async () => {
    renderForm();
    const date = (await screen.findByLabelText(/^date$/i)) as HTMLInputElement;
    expect(date.value).toBe(new Date().toISOString().slice(0, 10));
    expect(screen.getByRole('option', { name: 'Hall / Venue Rental' })).toBeInTheDocument();
  });

  it('blocks submission until required fields are valid', async () => {
    const { invoke } = renderForm();
    await screen.findByLabelText(/payee/i);
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    expect(await screen.findByText(/enter who was paid/i)).toBeInTheDocument();
    expect(screen.getByText('Select a category.')).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('submits a valid expense through the Edge Function and returns to the ledger', async () => {
    const { invoke } = renderForm();
    await screen.findByLabelText(/payee/i);

    fireEvent.change(screen.getByLabelText(/payee/i), { target: { value: 'City Power' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'util' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '120.50' } });
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('submit-expense', expect.anything());
    });
    expect(await screen.findByText(/ledger landing/i)).toBeInTheDocument();
  });

  it('uploads a receipt before submitting when one is attached', async () => {
    const { invoke, uploadFn } = renderForm();
    await screen.findByLabelText(/payee/i);

    fireEvent.change(screen.getByLabelText(/payee/i), { target: { value: 'Parish Hall LLC' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'hall' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '500' } });

    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/receipt/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(uploadFn).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith('submit-expense', expect.anything());
    });
  });
});
