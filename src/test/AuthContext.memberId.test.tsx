import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { makeAppClient } from './helpers/fakeDb';

function Probe() {
  const { status, role, memberId } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="member">{memberId ?? 'none'}</span>
    </div>
  );
}

function renderWith(client: ReturnType<typeof makeAppClient>['client']) {
  render(
    <AuthProvider client={client}>
      <Probe />
    </AuthProvider>,
  );
}

describe('useAuth().memberId', () => {
  it('exposes the linked member_id from the users row', async () => {
    const { client } = makeAppClient({ role: 'member', memberId: 'mbr-123' });
    renderWith(client);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('role')).toHaveTextContent('member');
    expect(screen.getByTestId('member')).toHaveTextContent('mbr-123');
  });

  it('is null when the user has no linked member row', async () => {
    const { client } = makeAppClient({ role: 'admin', memberId: null });
    renderWith(client);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('member')).toHaveTextContent('none');
  });
});
