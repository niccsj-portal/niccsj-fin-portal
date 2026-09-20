import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  HouseholdInput,
  HouseholdRow,
  ListMembersFilters,
  MemberInput,
  MemberRow,
} from '@/lib/members/types';

/**
 * Member + household data access (PRD §4.2). Thin wrappers over the Supabase
 * client so pages stay declarative and the query shapes are unit-testable with
 * an injected fake. Row Level Security (Sprint 1 story 1.3) is the real
 * authorization boundary; these helpers assume an authenticated editor.
 *
 * Audit-log rows for insert/update are emitted automatically by the database
 * triggers attached in story 1.4 — no client-side audit writes are needed.
 */

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** All members, optionally filtered by status / household, ordered by number. */
export async function listMembers(
  client: SupabaseClient,
  filters: ListMembersFilters = {},
): Promise<MemberRow[]> {
  let query = client.from('members').select('*');

  if (filters.status === 'active') query = query.eq('is_active', true);
  else if (filters.status === 'inactive') query = query.eq('is_active', false);

  if (filters.householdId) query = query.eq('household_id', filters.householdId);

  const { data, error } = await query.order('member_number', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MemberRow[];
}

export async function getMember(client: SupabaseClient, id: string): Promise<MemberRow> {
  return unwrap<MemberRow>(
    await client.from('members').select('*').eq('id', id).single(),
  );
}

/** Suggested next sequential member number (PRD §4.2; overridable by admin). */
export async function nextMemberNumber(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('next_member_number');
  if (error) throw new Error(error.message);
  return Number(data ?? 1);
}

export async function createMember(
  client: SupabaseClient,
  input: MemberInput,
): Promise<MemberRow> {
  return unwrap<MemberRow>(
    await client.from('members').insert(input).select().single(),
  );
}

export async function updateMember(
  client: SupabaseClient,
  id: string,
  input: Partial<MemberInput>,
): Promise<MemberRow> {
  return unwrap<MemberRow>(
    await client.from('members').update(input).eq('id', id).select().single(),
  );
}

/** Soft delete (PRD §4.2 — never hard-delete records). */
export async function deactivateMember(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('members').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reactivateMember(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('members').update({ is_active: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listHouseholds(client: SupabaseClient): Promise<HouseholdRow[]> {
  const { data, error } = await client
    .from('households')
    .select('*')
    .order('family_number', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HouseholdRow[];
}

/** Suggested next sequential family number (PRD §4.2; overridable by admin). */
export async function nextFamilyNumber(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('next_family_number');
  if (error) throw new Error(error.message);
  return Number(data ?? 1);
}

export async function createHousehold(
  client: SupabaseClient,
  input: HouseholdInput,
): Promise<HouseholdRow> {
  return unwrap<HouseholdRow>(
    await client.from('households').insert(input).select().single(),
  );
}

export async function updateHousehold(
  client: SupabaseClient,
  id: string,
  input: Partial<HouseholdInput>,
): Promise<HouseholdRow> {
  return unwrap<HouseholdRow>(
    await client.from('households').update(input).eq('id', id).select().single(),
  );
}

export async function setPrimaryMember(
  client: SupabaseClient,
  householdId: string,
  memberId: string,
): Promise<void> {
  const { error } = await client
    .from('households')
    .update({ primary_member_id: memberId })
    .eq('id', householdId);
  if (error) throw new Error(error.message);
}
