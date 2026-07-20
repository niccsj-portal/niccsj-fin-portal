import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { HealthPage } from '@/routes/admin/HealthPage';
import { makeAppClient } from './helpers/fakeDb';

function setup() {
  const ctx = makeAppClient({
    role: 'admin',
    tables: {
      users: { single: { role: 'admin', member_id: null } },
      client_errors: { count: 2 },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={ctx.client}>
        <HealthPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return ctx;
}

describe('HealthPage', () => {
  it('shows the build version, connectivity and recent error count', async () => {
    setup();
    expect(screen.getByRole('heading', { name: /system health/i })).toBeInTheDocument();
    // No VITE_COMMIT_SHA in the test env → 'development'.
    expect(screen.getByText('development')).toBeInTheDocument();
    // Supabase ping resolves online.
    expect(await screen.findByText('Online')).toBeInTheDocument();
    // client_errors head count resolves to 2.
    expect(await screen.findByText('2')).toBeInTheDocument();
  });
});
