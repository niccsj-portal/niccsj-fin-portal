import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { SignaturePage } from '@/routes/signature/SignaturePage';
import { makeAppClient } from './helpers/fakeDb';

function renderPage(signaturePath: string | null) {
  const helpers = makeAppClient({
    role: 'fin_secretary',
    tables: {
      users: { single: { role: 'fin_secretary', member_id: null, fin_sec_signature_path: signaturePath } },
    },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={helpers.client}>
        <SignaturePage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return helpers;
}

describe('SignaturePage (story 8.2)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the empty state when no signature is on file', async () => {
    renderPage(null);
    expect(await screen.findByText('No signature on file yet.')).toBeInTheDocument();
    expect(screen.getByText('Upload signature')).toBeInTheDocument();
  });

  it('previews an existing signature and offers replace + remove', async () => {
    renderPage('u1/signature.png');
    expect(await screen.findByAltText('Your signature')).toBeInTheDocument();
    expect(screen.getByText('Replace signature')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('uploads a selected PNG', async () => {
    const { uploadFn } = renderPage(null);
    await screen.findByText('No signature on file yet.');
    const input = document.getElementById('signature-file') as HTMLInputElement;
    const file = new File([new Uint8Array(100)], 'sig.png', { type: 'image/png' });
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('Signature saved.');
    expect(uploadFn).toHaveBeenCalled();
  });
});
