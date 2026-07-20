import { describe, expect, it } from 'vitest';

import {
  NAV_ITEMS,
  canAccessNav,
  canApproveExpenses,
  canRecordContributions,
  canRecordExpenses,
  canViewAllContributions,
  canViewExpenses,
  isTwoFactorEligible,
  isTwoFactorMandatory,
  navItemsForRole,
  roleLabel,
} from '@/lib/auth/roles';
import { classifyIdentifier, loginSchema } from '@/lib/auth/validation';

describe('roles & permissions (story 1.8)', () => {
  it('a plain member sees only universally-allowed nav items', () => {
    const keys = navItemsForRole('member').map((i) => i.key);
    expect(keys).toContain('home');
    expect(keys).toContain('contributions');
    expect(keys).not.toContain('members');
    expect(keys).not.toContain('admin');
  });

  it('only the admin role can reach the admin section', () => {
    expect(canAccessNav('admin', 'admin')).toBe(true);
    expect(canAccessNav('treasurer', 'admin')).toBe(false);
    expect(canAccessNav('member', 'admin')).toBe(false);
  });

  it('finance council cannot reach the members directory (aggregate-only)', () => {
    expect(canAccessNav('finance_council', 'members')).toBe(false);
  });

  it('the expense reader set (FS/Treasurer/Chaplain/Council/Admin) reaches expenses; members do not', () => {
    expect(canAccessNav('treasurer', 'expenses')).toBe(true);
    expect(canAccessNav('chaplain', 'expenses')).toBe(true);
    expect(canAccessNav('admin', 'expenses')).toBe(true);
    expect(canAccessNav('fin_secretary', 'expenses')).toBe(true);
    expect(canAccessNav('finance_council', 'expenses')).toBe(true);
    expect(canAccessNav('member', 'expenses')).toBe(false);
  });

  it('the notified set sees the Notifications nav item; members do not', () => {
    expect(navItemsForRole('finance_council').map((i) => i.key)).toContain('notifications');
    expect(navItemsForRole('treasurer').map((i) => i.key)).toContain('notifications');
    expect(navItemsForRole('chaplain').map((i) => i.key)).toContain('notifications');
    expect(navItemsForRole('fin_secretary').map((i) => i.key)).toContain('notifications');
    expect(navItemsForRole('admin').map((i) => i.key)).toContain('notifications');
    expect(navItemsForRole('member').map((i) => i.key)).not.toContain('notifications');
    expect(canAccessNav('finance_council', 'notifications')).toBe(true);
    expect(canAccessNav('member', 'notifications')).toBe(false);
  });

  it('returns no nav items for an unknown / null role', () => {
    expect(navItemsForRole(null)).toHaveLength(0);
    expect(canAccessNav(null, 'home')).toBe(false);
  });

  it('every nav item lists at least one permitted role', () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});

describe('contribution permissions (Sprint 4, PRD §7)', () => {
  it('only FS / Treasurer / Admin may record contributions (not the chaplain)', () => {
    expect(canRecordContributions('fin_secretary')).toBe(true);
    expect(canRecordContributions('treasurer')).toBe(true);
    expect(canRecordContributions('admin')).toBe(true);
    expect(canRecordContributions('chaplain')).toBe(false);
    expect(canRecordContributions('member')).toBe(false);
    expect(canRecordContributions('finance_council')).toBe(false);
    expect(canRecordContributions(null)).toBe(false);
  });

  it('privileged readers (incl. chaplain) see all contributions; members/council do not', () => {
    for (const role of ['fin_secretary', 'treasurer', 'chaplain', 'admin'] as const) {
      expect(canViewAllContributions(role)).toBe(true);
    }
    expect(canViewAllContributions('member')).toBe(false);
    expect(canViewAllContributions('finance_council')).toBe(false);
    expect(canViewAllContributions('group_fin_sec')).toBe(false);
    expect(canViewAllContributions(null)).toBe(false);
  });
});

describe('expense permissions (Sprint 5, PRD §7)', () => {
  it('only Treasurer / Admin may submit expenses', () => {
    expect(canRecordExpenses('treasurer')).toBe(true);
    expect(canRecordExpenses('admin')).toBe(true);
    expect(canRecordExpenses('chaplain')).toBe(false);
    expect(canRecordExpenses('fin_secretary')).toBe(false);
    expect(canRecordExpenses('member')).toBe(false);
    expect(canRecordExpenses(null)).toBe(false);
  });

  it('only Chaplain / Admin may approve or reject (submitter cannot self-approve)', () => {
    expect(canApproveExpenses('chaplain')).toBe(true);
    expect(canApproveExpenses('admin')).toBe(true);
    expect(canApproveExpenses('treasurer')).toBe(false);
    expect(canApproveExpenses('fin_secretary')).toBe(false);
    expect(canApproveExpenses('finance_council')).toBe(false);
    expect(canApproveExpenses(null)).toBe(false);
  });

  it('the notified set may read the expense ledger; members/group FS may not', () => {
    for (const role of ['fin_secretary', 'treasurer', 'chaplain', 'finance_council', 'admin'] as const) {
      expect(canViewExpenses(role)).toBe(true);
    }
    expect(canViewExpenses('member')).toBe(false);
    expect(canViewExpenses('group_fin_sec')).toBe(false);
    expect(canViewExpenses(null)).toBe(false);
  });
});

describe('2FA hybrid policy (AR-6)', () => {
  it('is mandatory for admin only', () => {
    expect(isTwoFactorMandatory('admin')).toBe(true);
    expect(isTwoFactorMandatory('treasurer')).toBe(false);
    expect(isTwoFactorMandatory('member')).toBe(false);
  });

  it('is eligible (opt-in or mandatory) for every privileged role but not members', () => {
    for (const role of ['admin', 'fin_secretary', 'treasurer', 'group_fin_sec', 'chaplain', 'finance_council'] as const) {
      expect(isTwoFactorEligible(role)).toBe(true);
    }
    expect(isTwoFactorEligible('member')).toBe(false);
  });

  it('labels roles for display', () => {
    expect(roleLabel('fin_secretary')).toBe('Financial Secretary');
    expect(roleLabel(null)).toBe('');
  });
});

describe('login identifier validation (story 1.5)', () => {
  it('classifies emails vs member numbers', () => {
    expect(classifyIdentifier('a@b.com')).toBe('email');
    expect(classifyIdentifier('42')).toBe('member_number');
  });

  it('accepts a valid email or member number', () => {
    expect(loginSchema.safeParse({ identifier: 'a@b.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ identifier: '42', password: 'x' }).success).toBe(true);
  });

  it('rejects a malformed identifier or empty password', () => {
    expect(loginSchema.safeParse({ identifier: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: '42', password: '' }).success).toBe(false);
  });
});
