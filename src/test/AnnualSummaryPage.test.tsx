import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { AnnualSummaryPage } from '@/routes/summary/AnnualSummaryPage';
import { makeAppClient } from './helpers/fakeDb';

function renderPrivileged(invokeResult: { data?: unknown; error?: unknown }) {
  const helpers = makeAppClient({
    role: 'treasurer',
    tables: { households: { rows: [{ id: 'h1', name: 'Okeke Family' }] } },
    invokeResult: invokeResult as { data?: unknown; error?: { message: string } | null },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={helpers.client}>
        <AnnualSummaryPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return helpers;
}

describe('AnnualSummaryPage (stories 8.4/8.5)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:pdf');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('lets a privileged role pick a household and generate the PDF', async () => {
    const { invoke } = renderPrivileged({
      data: { filename: 'summary.pdf', contentType: 'application/pdf', dataBase64: btoa('PDF') },
      error: null,
    });
    expect(await screen.findByText('Okeke Family')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Generate PDF'));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
  });

  it('shows the blocked message when no FS signature is on file', async () => {
    renderPrivileged({
      data: null,
      error: {
        message: 'HTTP 409',
        context: {
          json: async () => ({
            error: 'FS_SIGNATURE_REQUIRED',
            message: 'Financial Secretary signature is required before annual summaries can be issued.',
          }),
        },
      },
    });
    await screen.findByText('Okeke Family');
    fireEvent.click(screen.getByText('Generate PDF'));
    expect(
      await screen.findByText(/signature is required before annual summaries/i),
    ).toBeInTheDocument();
  });

  it('resolves the caller own household for a non-privileged member', async () => {
    const helpers = makeAppClient({
      role: 'member',
      memberId: 'm1',
      tables: {
        users: { single: { role: 'member', member_id: 'm1' } },
        members: { single: { household_id: 'h9' } },
      },
    });
    render(
      <MemoryRouter>
        <AuthProvider client={helpers.client}>
          <AnnualSummaryPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    // No household picker for a member; the generate button is available.
    expect(await screen.findByText('Generate PDF')).toBeInTheDocument();
    expect(screen.queryByText('Household')).not.toBeInTheDocument();
  });
});
