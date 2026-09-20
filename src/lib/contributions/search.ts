import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import { householdLabel } from '@/lib/members/search';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';

/**
 * Client-side filtering + aggregation over the (small) contributions set.
 * Server queries return household/member/category-scoped rows; these helpers
 * refine by year and free text, and roll the rows up for the ledger, the
 * member family view (story 4.6), and the annual-dues widget (story 4.7).
 */

export interface ContributionFilter {
  year?: number | 'all';
  categoryId?: string;
  householdId?: string;
  memberId?: string;
  search?: string;
}

export interface LedgerLookups {
  categoryName: (id: string) => string;
  householdName: (id: string | null) => string;
  memberName: (id: string | null) => string;
}

export function contributionYear(row: ContributionRow): number {
  return Number(row.contribution_date.slice(0, 4));
}

/** Recent years offered in selectors (current year first). */
export function recentYears(count = 5): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}

export function buildLookups(
  categories: CategoryRow[],
  households: HouseholdRow[],
  members: MemberRow[],
): LedgerLookups {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const hh = new Map(households.map((h) => [h.id, householdLabel(h)]));
  const mem = new Map(members.map((m) => [m.id, `${m.first_name} ${m.last_name}`.trim()]));
  return {
    categoryName: (id) => cat.get(id) ?? '—',
    householdName: (id) => (id ? (hh.get(id) ?? '—') : '—'),
    memberName: (id) => (id ? (mem.get(id) ?? '—') : '—'),
  };
}

export function contributionMatchesFilter(
  row: ContributionRow,
  filter: ContributionFilter,
  lookups: LedgerLookups,
): boolean {
  if (filter.year && filter.year !== 'all' && contributionYear(row) !== filter.year) {
    return false;
  }
  if (filter.categoryId && row.category_id !== filter.categoryId) return false;
  if (filter.householdId && row.household_id !== filter.householdId) return false;
  if (filter.memberId && row.member_id !== filter.memberId) return false;

  const term = (filter.search ?? '').trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    lookups.categoryName(row.category_id),
    lookups.householdName(row.household_id),
    lookups.memberName(row.member_id),
    row.notes ?? '',
    String(row.amount),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function filterContributions(
  rows: ContributionRow[],
  filter: ContributionFilter,
  lookups: LedgerLookups,
): ContributionRow[] {
  return rows.filter((r) => contributionMatchesFilter(r, filter, lookups));
}

export function totalAmount(rows: ContributionRow[]): number {
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  total: number;
}

/** Roll contributions up by category, descending by total. */
export function sumByCategory(
  rows: ContributionRow[],
  lookups: Pick<LedgerLookups, 'categoryName'>,
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.category_id, (totals.get(r.category_id) ?? 0) + Number(r.amount));
  }
  return [...totals.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: lookups.categoryName(categoryId),
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface DuesStatusRow {
  household: HouseholdRow;
  paid: boolean;
  total: number;
}

/**
 * Annual dues tracking (story 4.7): for each household, whether it has any
 * contribution in a dues category for the given year. `duesCategoryIds` are
 * the CMO/CWO/legacy-household-dues category ids.
 */
export function householdDuesStatus(
  households: HouseholdRow[],
  rows: ContributionRow[],
  duesCategoryIds: Set<string>,
  year: number,
): DuesStatusRow[] {
  return households.map((household) => {
    const paidRows = rows.filter(
      (r) =>
        r.household_id === household.id &&
        duesCategoryIds.has(r.category_id) &&
        contributionYear(r) === year,
    );
    return {
      household,
      paid: paidRows.length > 0,
      total: totalAmount(paidRows),
    };
  });
}

export function formatUSD(amount: number): string {
  return Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
