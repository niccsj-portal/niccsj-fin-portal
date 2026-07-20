// @ts-nocheck — Deno runtime; typechecked by `deno check`, not the SPA tsc build.
//
// Shared Supabase helpers for the expense-workflow Edge Functions
// (submit-expense / approve-expense / reject-expense). Every function:
//   * verifies the caller's JWT (a per-request client bound to the bearer token);
//   * resolves the caller's app_role from public.users;
//   * uses a service-role admin client for the privileged writes that bypass RLS.
//
// References: technology.md §7 (all Edge Functions verify JWT + role, re-validate
// inputs, write audit_log), PRD §6.4.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AppRole =
  | 'member'
  | 'fin_secretary'
  | 'treasurer'
  | 'group_fin_sec'
  | 'chaplain'
  | 'finance_council'
  | 'admin';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** A client that acts AS the caller (RLS applies), bound to their bearer token. */
export function userClient(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

/** A service-role client for privileged writes (bypasses RLS). Server-only. */
export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export interface Caller {
  id: string;
  role: AppRole;
}

/** Resolve the authenticated caller + their app_role, or null if unauthenticated. */
export async function resolveCaller(req: Request): Promise<Caller | null> {
  const supa = userClient(req);
  const { data: userData, error: userErr } = await supa.auth.getUser();
  if (userErr || !userData?.user) return null;

  const admin = adminClient();
  const { data: profile, error: profileErr } = await admin
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (profileErr || !profile) return null;

  return { id: userData.user.id, role: profile.role as AppRole };
}

export const EXPENSE_RECORDER_ROLES: AppRole[] = ['treasurer', 'admin'];
export const EXPENSE_APPROVER_ROLES: AppRole[] = ['chaplain', 'admin'];
/** Roles notified when an expense is submitted (PRD §7 "Notified of expenses"). */
export const NOTIFIED_ROLES: AppRole[] = [
  'fin_secretary',
  'treasurer',
  'chaplain',
  'finance_council',
  'admin',
];

/** Roles that may manage a group sub-account ledger (PRD §4.5/§7). The actual
 *  group(s) are still gated by the sub_account_users assignment. */
export const SUB_ACCOUNT_MANAGER_ROLES: AppRole[] = ['group_fin_sec', 'admin'];

/** True if the caller is assigned to the given sub-account (admin always passes). */
export async function isAssignedToSubAccount(
  callerId: string,
  role: AppRole,
  subAccountId: string,
): Promise<boolean> {
  if (role === 'admin') return true;
  const admin = adminClient();
  const { data, error } = await admin
    .from('sub_account_users')
    .select('id')
    .eq('user_id', callerId)
    .eq('sub_account_id', subAccountId)
    .maybeSingle();
  return !error && !!data;
}
