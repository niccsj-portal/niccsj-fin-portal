import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import type { AppRole } from '@/lib/auth/roles';

function renderShell(role: AppRole | null | undefined, props: { orgShortName?: string } = {}) {
  return render(
    <MemoryRouter>
      <AppShell role={role} orgShortName={props.orgShortName}>
        <p>page content</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    // jsdom doesn't implement matchMedia / IntersectionObserver — Radix
    // Dialog only needs a no-op matchMedia for portal sizing.
    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the children, the organisation short name, and the role badge label', () => {
    renderShell('member', { orgShortName: 'NICC-SJ' });

    expect(screen.getByText('page content')).toBeInTheDocument();
    expect(screen.getByText('NICC-SJ')).toBeInTheDocument();
    expect(screen.getByLabelText(/current role: member/i)).toHaveTextContent('Member');
  });

  it('omits the role badge when no role is provided', () => {
    renderShell(null);
    expect(screen.queryByLabelText(/current role/i)).not.toBeInTheDocument();
  });

  it('exposes a hamburger button on mobile that opens the navigation drawer', async () => {
    renderShell('admin');

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuButton).toBeInTheDocument();

    // No dialog is mounted while the drawer is closed.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(menuButton);

    // After clicking, Radix mounts the drawer as a dialog with our sr-only title.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/navigation menu/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });

  it('shows the Admin nav item for a System Admin', () => {
    renderShell('admin');
    const nav = screen.getAllByRole('navigation', { name: /primary/i })[0];
    expect(within(nav).getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /admin/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /members/i })).toBeInTheDocument();
  });

  it('hides admin-only and staff-only nav items from a plain member', () => {
    renderShell('member');
    const nav = screen.getAllByRole('navigation', { name: /primary/i })[0];
    expect(within(nav).getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /contributions/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /members/i })).not.toBeInTheDocument();
  });

  it('toggles the language selector label between English and Igbo', () => {
    renderShell('member');

    const button = screen.getByRole('button', { name: /language: english/i });
    expect(button).toHaveTextContent(/english/i);

    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: /language: igbo/i }),
    ).toHaveTextContent(/igbo/i);
  });
});
