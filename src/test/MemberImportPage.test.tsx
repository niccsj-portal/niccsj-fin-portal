import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { MemberImportPage } from '@/routes/members/MemberImportPage';
import { makeAppClient } from './helpers/fakeDb';

// Drive PapaParse synchronously: every parse resolves to two rows (one valid,
// one invalid) so the preview + import paths can be exercised without a real
// file reader.
vi.mock('papaparse', () => ({
  default: {
    parse: (_file: unknown, opts: { complete: (r: unknown) => void }) => {
      opts.complete({
        data: [
          { member_number: '21', first_name: 'Ada', last_name: 'Okafor', joined_date: '2021-01-01' },
          { member_number: '', first_name: '', last_name: '', joined_date: '' },
        ],
        errors: [],
      });
    },
  },
}));

function renderPage() {
  const app = makeAppClient({
    role: 'admin',
    tables: { members: { single: { id: 'new' } } },
  });
  render(
    <MemoryRouter>
      <AuthProvider client={app.client}>
        <MemberImportPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return app;
}

describe('MemberImportPage', () => {
  it('previews parsed rows and imports the valid ones', async () => {
    const app = renderPage();
    const input = screen.getByLabelText(/csv file/i);
    const file = new File(['x'], 'members.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/1 valid, 1 with errors/i)).toBeInTheDocument();
    expect(screen.getByText('Ada Okafor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /import 1 member/i }));

    await waitFor(() =>
      expect(screen.getByText(/imported 1 member/i)).toBeInTheDocument(),
    );
    expect(app.calls.inserted).toMatchObject({ first_name: 'Ada', last_name: 'Okafor' });
  });
});
