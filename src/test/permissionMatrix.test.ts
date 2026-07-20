import { describe, expect, it } from 'vitest';

import {
  MATRIX_ROLE_ORDER,
  PERMISSION_MATRIX,
  ROLE_COLUMN_LABELS,
} from '@/lib/admin/permissionMatrix';
import { APP_ROLES } from '@/lib/auth/roles';

describe('permissionMatrix', () => {
  it('lists every app role exactly once, in column order', () => {
    expect([...MATRIX_ROLE_ORDER].sort()).toEqual([...APP_ROLES].sort());
  });

  it('gives every action a value for every role', () => {
    for (const row of PERMISSION_MATRIX) {
      for (const role of MATRIX_ROLE_ORDER) {
        expect(['yes', 'no', 'conditional']).toContain(row.values[role]);
      }
    }
  });

  it('has a label for every column', () => {
    for (const role of MATRIX_ROLE_ORDER) {
      expect(ROLE_COLUMN_LABELS[role]).toBeTruthy();
    }
  });

  it('encodes the hard PRD §7 boundaries', () => {
    const find = (action: string) => PERMISSION_MATRIX.find((r) => r.action === action);

    // Only Chaplain + Admin approve expenses.
    const approve = find('Approve / reject expense');
    expect(approve?.values.chaplain).toBe('yes');
    expect(approve?.values.admin).toBe('yes');
    expect(approve?.values.treasurer).toBe('no');
    expect(approve?.values.member).toBe('no');

    // Finance Council is aggregate-only: no per-member detail.
    expect(find('View per-member financial details')?.values.finance_council).toBe('no');

    // Only Admin manages roles / health / categories / sub-account assignment.
    for (const action of [
      'Manage user roles',
      'View system health page (/admin/health)',
      'Manage categories (incl. legacy phase-out)',
      'Manage sub-accounts and Group Fin. Sec. assignment',
    ]) {
      const rowValues = find(action)?.values;
      expect(rowValues?.admin).toBe('yes');
      expect(rowValues?.member).toBe('no');
      expect(rowValues?.fin_secretary).toBe('no');
    }
  });
});
