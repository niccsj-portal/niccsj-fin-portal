import { APP_ROLES, ROLE_LABELS, type AppRole } from '@/lib/auth/roles';

/**
 * The role-permission matrix (Sprint 9 story 9.2; PRD §4.11, §7). This is a
 * faithful, code-checked mirror of the PRD §7 "Roles & Permissions Matrix"
 * table so an Admin can confirm each role's effective access at a glance.
 *
 * IMPORTANT: this is a *documentation / review* surface only. Postgres RLS is
 * the authoritative authorization boundary (technology.md §6.2); these cells
 * never grant or deny anything at runtime.
 */

/** How a single role is permitted to perform an action. */
export type PermissionValue = 'yes' | 'no' | 'conditional';

export interface PermissionRow {
  /** The action, verbatim from PRD §7. */
  action: string;
  /** Per-role permission, keyed by the `AppRole` enum value. */
  values: Record<AppRole, PermissionValue>;
  /** Optional footnote clarifying a conditional cell. */
  note?: string;
}

/** Column order for the matrix view — matches PRD §7 left-to-right. */
export const MATRIX_ROLE_ORDER: readonly AppRole[] = [
  'member',
  'fin_secretary',
  'treasurer',
  'group_fin_sec',
  'chaplain',
  'finance_council',
  'admin',
];

// Assert the display order is a permutation of every app role, so a future
// role addition forces this file to be revisited.
{
  const missing = APP_ROLES.filter((r) => !MATRIX_ROLE_ORDER.includes(r));
  if (missing.length > 0) {
    throw new Error(`permissionMatrix: MATRIX_ROLE_ORDER missing roles: ${missing.join(', ')}`);
  }
}

export const ROLE_COLUMN_LABELS: Record<AppRole, string> = ROLE_LABELS;

/** Short helper to build a row from an ordered 7-tuple (matches PRD columns). */
function row(
  action: string,
  cells: readonly [
    PermissionValue,
    PermissionValue,
    PermissionValue,
    PermissionValue,
    PermissionValue,
    PermissionValue,
    PermissionValue,
  ],
  note?: string,
): PermissionRow {
  const values = {} as Record<AppRole, PermissionValue>;
  MATRIX_ROLE_ORDER.forEach((role, i) => {
    values[role] = cells[i];
  });
  return { action, values, note };
}

const Y: PermissionValue = 'yes';
const N: PermissionValue = 'no';
const C: PermissionValue = 'conditional';

/**
 * The matrix rows, in PRD §7 order. Columns are:
 * [member, fin_secretary, treasurer, group_fin_sec, chaplain, finance_council, admin].
 */
export const PERMISSION_MATRIX: readonly PermissionRow[] = [
  row('View own profile', [Y, Y, Y, Y, Y, Y, Y]),
  row('Edit own profile', [Y, Y, Y, Y, Y, Y, Y]),
  row('View own/family contributions', [Y, Y, Y, C, Y, Y, Y], 'Group Fin. Sec. only if they are a member.'),
  row('Download own family annual tax summary', [Y, Y, Y, C, Y, N, Y], 'Group Fin. Sec.: own family only.'),
  row('View any member profile', [N, Y, Y, N, Y, N, Y]),
  row('Create/edit member', [N, Y, N, N, Y, N, Y]),
  row('Record contribution (main ledger)', [N, Y, Y, N, N, N, Y]),
  row('Record sub-account income/expense (assigned group only)', [N, Y, Y, Y, Y, N, Y]),
  row('View other group\u2019s sub-account details', [N, Y, Y, N, Y, C, Y], 'Finance Council: aggregate only.'),
  row('Submit monthly sub-account summary report', [N, Y, Y, Y, Y, N, Y]),
  row('Submit expense', [N, N, Y, N, N, N, Y]),
  row('Approve / reject expense', [N, N, N, N, Y, N, Y]),
  row('Notified of expenses', [N, Y, Y, C, Y, Y, Y], 'Group Fin. Sec.: optional.'),
  row('View aggregate financial dashboard', [N, Y, Y, C, Y, Y, Y], 'Group Fin. Sec.: own sub-account page.'),
  row('View per-member financial details', [N, Y, Y, N, Y, N, Y], 'Finance Council is intentionally aggregate-only.'),
  row('Generate per-family tax summary (any family)', [N, Y, Y, N, Y, N, Y]),
  row('Upload / replace own Fin. Sec. signature image', [N, Y, N, N, N, N, Y], 'Admin: any signature, for recovery.'),
  row('Generate End-of-Year summary (requires FS signature on file)', [N, Y, Y, N, Y, N, Y]),
  row('View audit log', [N, N, N, N, C, N, Y], 'Chaplain: optional.'),
  row('View system health page (/admin/health)', [N, N, N, N, N, N, Y]),
  row('Manage categories (incl. legacy phase-out)', [N, N, N, N, N, N, Y]),
  row('Manage sub-accounts and Group Fin. Sec. assignment', [N, N, N, N, N, N, Y]),
  row('Manage user roles', [N, N, N, N, N, N, Y]),
  row('Export reports', [N, Y, Y, C, Y, C, Y], 'Group Fin. Sec.: own group only. Finance Council: aggregates.'),
];
