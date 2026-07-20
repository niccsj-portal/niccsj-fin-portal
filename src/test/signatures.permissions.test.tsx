import { describe, expect, it } from 'vitest';

import { canAccessNav, navItemsForRole, type AppRole } from '@/lib/auth/roles';

/**
 * Sprint 8 story 8.6 QA — nav/route permissions for the signature + annual
 * summary features (PRD §7). Route access is also enforced by RequireRole and,
 * authoritatively, by RLS + the Edge Function; this locks the presentation gate.
 */
describe('signature + annual summary permissions (story 8.6)', () => {
  it('limits the signature screen to Financial Secretary + Admin', () => {
    expect(canAccessNav('fin_secretary', 'signature')).toBe(true);
    expect(canAccessNav('admin', 'signature')).toBe(true);
    for (const role of ['member', 'treasurer', 'chaplain', 'group_fin_sec', 'finance_council'] as AppRole[]) {
      expect(canAccessNav(role, 'signature')).toBe(false);
    }
  });

  it('exposes the annual summary to the family head + leadership (not group/council)', () => {
    for (const role of ['member', 'fin_secretary', 'treasurer', 'chaplain', 'admin'] as AppRole[]) {
      expect(canAccessNav(role, 'annual-summary')).toBe(true);
    }
    expect(canAccessNav('group_fin_sec', 'annual-summary')).toBe(false);
    expect(canAccessNav('finance_council', 'annual-summary')).toBe(false);
  });

  it('surfaces both items in a Financial Secretary nav', () => {
    const keys = navItemsForRole('fin_secretary').map((n) => n.key);
    expect(keys).toEqual(expect.arrayContaining(['signature', 'annual-summary']));
  });
});
