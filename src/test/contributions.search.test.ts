import { describe, expect, it } from 'vitest';

import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import {
  buildLookups,
  contributionYear,
  filterContributions,
  householdDuesStatus,
  recentYears,
  sumByCategory,
  totalAmount,
  formatUSD,
} from '@/lib/contributions/search';

const categories = [
  { id: 'cmo', name: 'CMO Dues' },
  { id: 'off', name: 'Offertory' },
] as unknown as CategoryRow[];

const households = [
  { id: 'h1', name: 'Okeke' },
  { id: 'h2', name: 'Eze' },
] as unknown as HouseholdRow[];

const members = [
  { id: 'm1', household_id: 'h1', first_name: 'Ada', last_name: 'Okeke' },
] as unknown as MemberRow[];

function row(partial: Partial<ContributionRow>): ContributionRow {
  return {
    id: 'c',
    member_id: null,
    household_id: 'h1',
    contribution_date: '2025-03-01',
    amount: 10,
    category_id: 'cmo',
    payment_method: 'cash',
    notes: null,
    correction_reason: null,
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

const lookups = buildLookups(categories, households, members);

describe('contribution search/aggregation (story 4.4/4.6)', () => {
  it('extracts the calendar year from a contribution date', () => {
    expect(contributionYear(row({ contribution_date: '2024-12-31' }))).toBe(2024);
  });

  it('lists recent years with the current year first', () => {
    const years = recentYears();
    expect(years[0]).toBe(new Date().getFullYear());
    expect(years).toHaveLength(5);
  });

  it('filters by year, category and free-text', () => {
    const rows = [
      row({ id: 'a', contribution_date: '2025-01-01', category_id: 'cmo', household_id: 'h1' }),
      row({ id: 'b', contribution_date: '2024-01-01', category_id: 'off', household_id: 'h2' }),
      row({ id: 'c', contribution_date: '2025-06-01', category_id: 'off', household_id: 'h2' }),
    ];
    expect(filterContributions(rows, { year: 2025 }, lookups).map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterContributions(rows, { categoryId: 'cmo' }, lookups).map((r) => r.id)).toEqual(['a']);
    expect(filterContributions(rows, { search: 'eze' }, lookups).map((r) => r.id)).toEqual(['b', 'c']);
    expect(filterContributions(rows, { year: 'all' }, lookups)).toHaveLength(3);
  });

  it('totals amounts and rolls up by category descending', () => {
    const rows = [
      row({ amount: 100, category_id: 'cmo' }),
      row({ amount: 50, category_id: 'off' }),
      row({ amount: 25, category_id: 'cmo' }),
    ];
    expect(totalAmount(rows)).toBe(175);
    const byCat = sumByCategory(rows, lookups);
    expect(byCat[0]).toMatchObject({ categoryId: 'cmo', name: 'CMO Dues', total: 125 });
    expect(byCat[1]).toMatchObject({ categoryId: 'off', total: 50 });
  });

  it('reports per-household annual dues status (story 4.7)', () => {
    const yr = 2025;
    const rows = [
      row({ household_id: 'h1', category_id: 'cmo', amount: 20, contribution_date: `${yr}-02-01` }),
      row({ household_id: 'h2', category_id: 'off', amount: 5, contribution_date: `${yr}-02-01` }),
    ];
    const statuses = householdDuesStatus(households, rows, new Set(['cmo']), yr);
    const h1 = statuses.find((s) => s.household.id === 'h1');
    const h2 = statuses.find((s) => s.household.id === 'h2');
    expect(h1?.paid).toBe(true);
    expect(h1?.total).toBe(20);
    expect(h2?.paid).toBe(false);
  });

  it('formats amounts as USD currency', () => {
    expect(formatUSD(1234.5)).toBe('$1,234.50');
  });
});
