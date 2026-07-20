import { describe, expect, it } from 'vitest';

import {
  canManageSubAccounts,
  canOverseeSubAccounts,
  canViewSubAccounts,
  navItemsForRole,
  type AppRole,
} from '@/lib/auth/roles';

/**
 * Story 6.6 — group-isolation permissions (PRD §7). A Group Financial Secretary
 * manages (records) but does not oversee all groups; overseers read every
 * rollup but never record on a group ledger. RLS is the authoritative boundary;
 * these helpers only gate the UI affordance.
 */
describe('sub-account role helpers (story 6.6)', () => {
  it('lets only Group FS and Admin manage (record on) a group ledger', () => {
    expect(canManageSubAccounts('group_fin_sec')).toBe(true);
    expect(canManageSubAccounts('admin')).toBe(true);
    for (const r of ['fin_secretary', 'treasurer', 'finance_council', 'chaplain', 'member'] as AppRole[]) {
      expect(canManageSubAccounts(r)).toBe(false);
    }
  });

  it('treats FS / Treasurer / Finance Council / Admin as overseers (read all)', () => {
    for (const r of ['fin_secretary', 'treasurer', 'finance_council', 'admin'] as AppRole[]) {
      expect(canOverseeSubAccounts(r)).toBe(true);
    }
    expect(canOverseeSubAccounts('group_fin_sec')).toBe(false);
    expect(canOverseeSubAccounts('chaplain')).toBe(false);
    expect(canOverseeSubAccounts('member')).toBe(false);
  });

  it('admits managers and overseers to the area, and excludes member/chaplain', () => {
    expect(canViewSubAccounts('group_fin_sec')).toBe(true);
    expect(canViewSubAccounts('finance_council')).toBe(true);
    expect(canViewSubAccounts('member')).toBe(false);
    expect(canViewSubAccounts('chaplain')).toBe(false);
    expect(canViewSubAccounts(null)).toBe(false);
  });

  it('shows the Sub-accounts nav item exactly to the viewer set', () => {
    const hasSubAccounts = (role: AppRole) =>
      navItemsForRole(role).some((n) => n.key === 'sub-accounts');
    expect(hasSubAccounts('group_fin_sec')).toBe(true);
    expect(hasSubAccounts('finance_council')).toBe(true);
    expect(hasSubAccounts('admin')).toBe(true);
    expect(hasSubAccounts('member')).toBe(false);
    expect(hasSubAccounts('chaplain')).toBe(false);
  });
});
