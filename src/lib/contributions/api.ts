import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CategoryRow,
  ContributionInput,
  ContributionRow,
  ContributionUpdate,
  ListContributionsFilters,
  NewCategoryInput,
} from '@/lib/contributions/types';

/**
 * Contribution + category data access (PRD §4.3). Thin wrappers over the
 * Supabase client so pages stay declarative and query shapes are unit-testable
 * with an injected fake. Row Level Security (Sprint 4 migration) is the real
 * authorization boundary:
 *   - members read only their own household's rows (`caller_household_id()`);
 *   - privileged readers (FS/Treasurer/Chaplain/Admin) read all;
 *   - only recorders (FS/Treasurer/Admin) insert/update.
 *
 * Audit-log rows and created_by/updated_by stamping are handled by database
 * triggers (stories 1.4 + 4.1) — no client-side audit writes are needed.
 */

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** All categories, ordered by name. Pass `type` to scope to income/expense. */
export async function listCategories(
  client: SupabaseClient,
  opts: { type?: 'income' | 'expense'; activeOnly?: boolean } = {},
): Promise<CategoryRow[]> {
  let query = client.from('categories').select('*');
  if (opts.type) query = query.eq('type', opts.type);
  if (opts.activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRow[];
}

/** Create an ad-hoc category (e.g. a donation sub-category — story 4.3). */
export async function createCategory(
  client: SupabaseClient,
  input: NewCategoryInput,
): Promise<CategoryRow> {
  return unwrap<CategoryRow>(
    await client.from('categories').insert(input).select().single(),
  );
}

/**
 * Contributions, newest first. Server-side equality filters narrow the set
 * (RLS scopes a member to their own household automatically); date-range, year,
 * and free-text filtering happen client-side over the small result (search.ts).
 */
export async function listContributions(
  client: SupabaseClient,
  filters: ListContributionsFilters = {},
): Promise<ContributionRow[]> {
  const { activeOnly = true } = filters;
  let query = client.from('contributions').select('*');
  if (activeOnly) query = query.eq('is_active', true);
  if (filters.householdId) query = query.eq('household_id', filters.householdId);
  if (filters.memberId) query = query.eq('member_id', filters.memberId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  const { data, error } = await query.order('contribution_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContributionRow[];
}

export async function getContribution(
  client: SupabaseClient,
  id: string,
): Promise<ContributionRow> {
  return unwrap<ContributionRow>(
    await client.from('contributions').select('*').eq('id', id).single(),
  );
}

export async function createContribution(
  client: SupabaseClient,
  input: ContributionInput,
): Promise<ContributionRow> {
  return unwrap<ContributionRow>(
    await client.from('contributions').insert(input).select().single(),
  );
}

/** Edit/correct an entry (story 4.5). `correction_reason` is audited. */
export async function updateContribution(
  client: SupabaseClient,
  id: string,
  input: ContributionUpdate,
): Promise<ContributionRow> {
  return unwrap<ContributionRow>(
    await client.from('contributions').update(input).eq('id', id).select().single(),
  );
}

/** Soft-void an entry (never hard-delete financial rows — PRD §6.3). */
export async function voidContribution(
  client: SupabaseClient,
  id: string,
  reason: string,
): Promise<void> {
  const { error } = await client
    .from('contributions')
    .update({ is_active: false, correction_reason: reason })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
