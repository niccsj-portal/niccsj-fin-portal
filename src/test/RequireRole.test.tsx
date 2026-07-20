import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { RequireRole } from '@/components/auth/RequireRole';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { makeFakeSupabase } from '@/test/helpers/fakeSupabase';

function renderWithRole(role: string, navKey: string) {
  const { client } = makeFakeSupabase({ session: { user: { id: 'u1' } }, role });
  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <RequireRole navKey={navKey}>
          <p>protected content</p>
        </RequireRole>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireRole (story 1.8)', () => {
  it('renders the protected content when the role is permitted', async () => {
    renderWithRole('admin', 'admin');
    expect(await screen.findByText(/protected content/i)).toBeInTheDocument();
  });

  it('shows the Access denied page when the role is not permitted', async () => {
    renderWithRole('member', 'admin');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });
});
