import { describe, expect, it } from 'vitest';

import {
  compareHouseholdsByFamilyNumber,
  householdLabel,
  householdMatchesSearch,
} from '@/lib/members/search';
import type { HouseholdRow } from '@/lib/members/types';

function household(over: Partial<HouseholdRow> = {}): HouseholdRow {
  return {
    id: 'h1',
    name: 'Ogamba (Aidan & Celine)',
    family_number: 1,
    primary_member_id: null,
    is_active: true,
    opening_balance: 0,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

describe('householdLabel', () => {
  it('prefixes the family number so the FS can read it off a donation', () => {
    expect(householdLabel(household())).toBe('1 — Ogamba (Aidan & Celine)');
  });

  it('falls back to the bare name when no family number is assigned yet', () => {
    expect(householdLabel(household({ family_number: null }))).toBe('Ogamba (Aidan & Celine)');
  });
});

describe('householdMatchesSearch', () => {
  it('matches everything on an empty term', () => {
    expect(householdMatchesSearch(household(), '')).toBe(true);
    expect(householdMatchesSearch(household(), '  ')).toBe(true);
  });

  it('matches on the family number the donor quotes', () => {
    expect(householdMatchesSearch(household({ family_number: 12 }), '12')).toBe(true);
    expect(householdMatchesSearch(household({ family_number: 12 }), '99')).toBe(false);
  });

  it('matches the family number exactly, not as a substring', () => {
    // Searching "1" must not drag in families 10..19 — the FS is keying an id.
    expect(householdMatchesSearch(household({ family_number: 12 }), '1')).toBe(false);
    expect(householdMatchesSearch(household({ family_number: 1 }), '1')).toBe(true);
  });

  it('still matches by name (case-insensitive) for same-surname families', () => {
    expect(householdMatchesSearch(household(), 'ogamba')).toBe(true);
    expect(householdMatchesSearch(household(), 'CELINE')).toBe(true);
    expect(householdMatchesSearch(household(), 'nwosu')).toBe(false);
  });

  it('does not match an unnumbered household by number', () => {
    expect(householdMatchesSearch(household({ family_number: null }), '1')).toBe(false);
  });
});

describe('compareHouseholdsByFamilyNumber', () => {
  it('orders numerically, not lexically (2 before 10)', () => {
    const rows = [
      household({ id: 'a', family_number: 10 }),
      household({ id: 'b', family_number: 2 }),
    ];
    expect(rows.sort(compareHouseholdsByFamilyNumber).map((h) => h.id)).toEqual(['b', 'a']);
  });

  it('sorts unnumbered households last, then by name', () => {
    const rows = [
      household({ id: 'z', family_number: null, name: 'Zebra' }),
      household({ id: 'a', family_number: null, name: 'Adiele' }),
      household({ id: 'n', family_number: 5 }),
    ];
    expect(rows.sort(compareHouseholdsByFamilyNumber).map((h) => h.id)).toEqual(['n', 'a', 'z']);
  });
});
