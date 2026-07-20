import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '../App';
import { AuthProvider } from '@/lib/auth/AuthContext';

/**
 * With no Supabase client configured the AuthProvider resolves to
 * "unauthenticated", so any app route should funnel the visitor to the login
 * screen (backlog 1.5 / 1.8). This proves the route guards + redirect wiring.
 */
describe('App routing', () => {
  it('redirects an unauthenticated visitor to the sign-in screen', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider client={null}>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or member number/i)).toBeInTheDocument();
  });
});
