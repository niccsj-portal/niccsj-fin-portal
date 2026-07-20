import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { DeactivateMemberDialog } from '@/routes/members/DeactivateMemberDialog';
import type { MemberRow } from '@/lib/members/types';
import { makeAppClient } from './helpers/fakeDb';

function member(overrides: Partial<MemberRow> = {}): MemberRow {
  return {
    id: 'm1',
    member_number: 7,
    first_name: 'Ada',
    last_name: 'Okafor',
    email: null,
    phone: null,
    address: null,
    joined_date: '2020-01-01',
    household_id: null,
    role_in_household: null,
    baptism_status: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function renderDialog(target: MemberRow, onConfirmed = vi.fn(), onOpenChange = vi.fn()) {
  const app = makeAppClient({ role: 'admin', tables: { members: { rows: [] } } });
  render(
    <MemoryRouter>
      <AuthProvider client={app.client}>
        <DeactivateMemberDialog
          member={target}
          open
          onOpenChange={onOpenChange}
          onConfirmed={onConfirmed}
        />
      </AuthProvider>
    </MemoryRouter>,
  );
  return { app, onConfirmed, onOpenChange };
}

describe('DeactivateMemberDialog', () => {
  it('soft-deletes an active member and confirms', async () => {
    const { app, onConfirmed, onOpenChange } = renderDialog(member());
    expect(await screen.findByText(/deactivate member/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(app.calls.updated).toMatchObject({ is_active: false });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('restores an inactive member', async () => {
    const { app, onConfirmed } = renderDialog(member({ is_active: false }));
    expect(await screen.findByText(/restore member/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^restore$/i }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(app.calls.updated).toMatchObject({ is_active: true });
  });

  it('renders nothing when no member is selected', () => {
    const app = makeAppClient({ role: 'admin' });
    const { container } = render(
      <MemoryRouter>
        <AuthProvider client={app.client}>
          <DeactivateMemberDialog
            member={null}
            open
            onOpenChange={vi.fn()}
            onConfirmed={vi.fn()}
          />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
