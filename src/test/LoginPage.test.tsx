import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { LoginPage } from '@/routes/LoginPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { makeFakeSupabase } from '@/test/helpers/fakeSupabase';

function renderLogin(options = {}) {
  const { client, spies } = makeFakeSupabase(options);
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Dashboard landing</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return spies;
}

function fillAndSubmit(identifier: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email or member number/i), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('LoginPage (story 1.5)', () => {
  it('surfaces validation errors when fields are empty', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter your email or member number/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
  });

  it('signs in with an email address', async () => {
    const spies = renderLogin();
    fillAndSubmit('user@example.com', 'secret123');

    await waitFor(() => {
      expect(spies.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      });
    });
    expect(await screen.findByText(/dashboard landing/i)).toBeInTheDocument();
  });

  it('resolves a member number to an email server-side before signing in', async () => {
    const spies = renderLogin({ rpcEmail: 'member7@example.com' });
    fillAndSubmit('7', 'secret123');

    await waitFor(() => {
      expect(spies.rpc).toHaveBeenCalledWith('email_for_member_number', { p_member_number: 7 });
    });
    expect(spies.signInWithPassword).toHaveBeenCalledWith({
      email: 'member7@example.com',
      password: 'secret123',
    });
  });

  it('shows an error when credentials are rejected', async () => {
    renderLogin({ signInError: true });
    fillAndSubmit('user@example.com', 'wrong');
    expect(await screen.findByText(/incorrect credentials/i)).toBeInTheDocument();
  });

  it('shows an error when the member number cannot be resolved', async () => {
    renderLogin({ rpcEmail: null });
    fillAndSubmit('999', 'secret123');
    expect(await screen.findByText(/no account matches that member number/i)).toBeInTheDocument();
  });
});
