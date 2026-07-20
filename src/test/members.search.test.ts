import { describe, expect, it } from 'vitest';

import { memberMatchesSearch } from '@/lib/members/search';
import type { MemberRow } from '@/lib/members/types';

const base: MemberRow = {
  id: 'm1',
  member_number: 42,
  first_name: 'Chidi',
  last_name: 'Okeke',
  email: 'chidi@example.com',
  phone: null,
  address: null,
  joined_date: '2020-01-01',
  household_id: null,
  role_in_household: null,
  baptism_status: null,
  is_active: true,
  created_at: '',
  updated_at: '',
};

describe('memberMatchesSearch', () => {
  it('matches everything on an empty term', () => {
    expect(memberMatchesSearch(base, '')).toBe(true);
    expect(memberMatchesSearch(base, '   ')).toBe(true);
  });

  it('matches by member number', () => {
    expect(memberMatchesSearch(base, '42')).toBe(true);
    expect(memberMatchesSearch(base, '99')).toBe(false);
  });

  it('matches by first, last, or full name (case-insensitive)', () => {
    expect(memberMatchesSearch(base, 'chidi')).toBe(true);
    expect(memberMatchesSearch(base, 'OKEKE')).toBe(true);
    expect(memberMatchesSearch(base, 'chidi okeke')).toBe(true);
  });

  it('matches by email', () => {
    expect(memberMatchesSearch(base, 'chidi@example')).toBe(true);
  });

  it('handles a null email without throwing', () => {
    expect(memberMatchesSearch({ ...base, email: null }, 'chidi')).toBe(true);
    expect(memberMatchesSearch({ ...base, email: null }, 'nomatch')).toBe(false);
  });
});
