import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { PermissionMatrixPage } from '@/routes/admin/PermissionMatrixPage';
import { PERMISSION_MATRIX } from '@/lib/admin/permissionMatrix';

describe('PermissionMatrixPage', () => {
  it('renders the matrix with role columns and action rows', () => {
    render(
      <MemoryRouter>
        <PermissionMatrixPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /role-permission matrix/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Approve / reject expense')).toBeInTheDocument();
    expect(screen.getByText('Manage user roles')).toBeInTheDocument();
    // Column headers for each role.
    expect(screen.getByRole('columnheader', { name: /system admin/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /finance council/i })).toBeInTheDocument();
    // Every action row is present.
    expect(screen.getAllByRole('row')).toHaveLength(PERMISSION_MATRIX.length + 1);
  });
});
