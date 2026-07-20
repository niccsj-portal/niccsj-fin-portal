import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppRole } from '@/lib/auth/roles';
import type {
  AdminUserRow,
  AuditLogFilters,
  AuditLogRow,
  CategoryRow,
  SubAccountRow,
  SubAccountUserRow,
} from '@/lib/admin/types';

/**
 * Admin Console data access (Sprint 9; PRD §4.11). Thin, unit-testable wrappers
 * over the Supabase client. Every table touched here is admin-gated by RLS
 * (users, sub_account_users) or admin-readable (audit_log, client_errors), so
 * these helpers assume an authenticated System Admin — RLS is the real boundary
 * (technology.md §6.2). Category writes reuse the recorder RLS on categories.
 *
 * Audit rows for user/category mutations are emitted automatically by the
 * database triggers (story 1.4) — no client-side audit writes here.
 */

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Users + role assignment (story 9.1)
// ---------------------------------------------------------------------------

/** Every app user, newest first. Admin-only via RLS. */
export async function listUsers(client: SupabaseClient): Promise<AdminUserRow[]> {
  const { data, error } = await client
    .from('users')
    .select('id, email, role, member_id, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []) as AdminUserRow[];
}

/** Change a user's role (PRD §7 "Manage user roles"; admin-only via RLS). */
export async function updateUserRole(
  client: SupabaseClient,
  userId: string,
  role: AppRole,
): Promise<void> {
  const { error } = await client.from('users').update({ role }).eq('id', userId);
  fail(error);
}

/** Activate / deactivate an app user (soft — never hard-delete). */
export async function setUserActive(
  client: SupabaseClient,
  userId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await client.from('users').update({ is_active: isActive }).eq('id', userId);
  fail(error);
}

// ---------------------------------------------------------------------------
// Audit log explorer (story 9.3)
// ---------------------------------------------------------------------------

/** Filtered audit-log read, newest first (admin/chaplain via RLS). */
export async function listAuditLog(
  client: SupabaseClient,
  filters: AuditLogFilters = {},
  limit = 200,
): Promise<AuditLogRow[]> {
  let query = client.from('audit_log').select('*');

  if (filters.userId) query = query.eq('user_id', filters.userId);
  if (filters.entity) query = query.eq('entity', filters.entity);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.from) query = query.gte('occurred_at', filters.from);
  if (filters.to) query = query.lte('occurred_at', filters.to);

  const { data, error } = await query
    .order('occurred_at', { ascending: false })
    .limit(limit);
  fail(error);
  return (data ?? []) as AuditLogRow[];
}

// ---------------------------------------------------------------------------
// Health (story 9.4)
// ---------------------------------------------------------------------------

/** Count of client-side errors captured since `since` (admin-only via RLS). */
export async function recentClientErrorCount(
  client: SupabaseClient,
  since: string,
): Promise<number> {
  const { count, error } = await client
    .from('client_errors')
    .select('id', { count: 'exact', head: true })
    .gte('occurred_at', since);
  fail(error);
  return count ?? 0;
}

/**
 * Lightweight Supabase reachability probe: a cheap, RLS-safe read. Resolves to
 * `true` when the query round-trips without error, `false` otherwise. Never
 * throws so the health page can render a red/green indicator.
 */
export async function pingSupabase(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Category management (story 9.5)
// ---------------------------------------------------------------------------

/** Every category, income first then by name (recorder/admin readable). */
export async function listCategories(client: SupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  fail(error);
  return (data ?? []) as CategoryRow[];
}

/**
 * Create a contribution/expense category (PRD §4.3). RLS restricts writes to
 * recorders (FS/Treasurer/Admin); the unique (name, type) constraint prevents
 * duplicates. `parentId` supports donation sub-categories.
 */
export async function createCategory(
  client: SupabaseClient,
  input: { name: string; type: 'income' | 'expense'; parentId?: string | null },
): Promise<CategoryRow> {
  const { data, error } = await client
    .from('categories')
    .insert({ name: input.name.trim(), type: input.type, parent_id: input.parentId ?? null })
    .select()
    .single();
  fail(error);
  return data as CategoryRow;
}

/** Activate / deactivate (phase-out) a category (PRD §4.3 legacy dues). */
export async function setCategoryActive(
  client: SupabaseClient,
  categoryId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', categoryId);
  fail(error);
}

// ---------------------------------------------------------------------------
// Sub-account & Group FS assignment (story 9.6)
// ---------------------------------------------------------------------------

/** Every sub-account, by name (CMO/CWO). */
export async function listSubAccounts(client: SupabaseClient): Promise<SubAccountRow[]> {
  const { data, error } = await client
    .from('sub_accounts')
    .select('*')
    .order('name', { ascending: true });
  fail(error);
  return (data ?? []) as SubAccountRow[];
}

/**
 * Create a sub-account (PRD §4.5). Admin-only via the `sub_accounts_insert_admin`
 * RLS policy; `slug` is the stable lowercase code and is unique.
 */
export async function createSubAccount(
  client: SupabaseClient,
  input: { slug: string; name: string; description?: string | null },
): Promise<SubAccountRow> {
  const { data, error } = await client
    .from('sub_accounts')
    .insert({
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select()
    .single();
  fail(error);
  return data as SubAccountRow;
}

/** Every Group-FS ↔ sub-account assignment (admin-only via RLS). */
export async function listSubAccountUsers(
  client: SupabaseClient,
): Promise<SubAccountUserRow[]> {
  const { data, error } = await client
    .from('sub_account_users')
    .select('*')
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []) as SubAccountUserRow[];
}

/** Assign a user to a sub-account (admin-only via RLS). Idempotent server-side. */
export async function assignSubAccountUser(
  client: SupabaseClient,
  subAccountId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from('sub_account_users')
    .insert({ sub_account_id: subAccountId, user_id: userId });
  fail(error);
}

/** Remove a Group-FS ↔ sub-account assignment (admin-only via RLS). */
export async function removeSubAccountUser(
  client: SupabaseClient,
  assignmentId: string,
): Promise<void> {
  const { error } = await client.from('sub_account_users').delete().eq('id', assignmentId);
  fail(error);
}
