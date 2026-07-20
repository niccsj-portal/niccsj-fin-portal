// @ts-nocheck — Deno runtime; typechecked by `deno check`, not the SPA tsc build.
//
// submit-sub-account-report (Sprint 6 story 6.4, PRD §4.5/§6.4)
// -------------------------------------------------------------
// The assigned Group Financial Secretary submits a month's summary:
//   1. verify JWT + role (only SUB_ACCOUNT_MANAGER_ROLES may submit);
//   2. verify the caller is ASSIGNED to the requested sub-account
//      (sub_account_users) — group isolation (PRD §7);
//   3. re-validate the input (sub-account + period);
//   4. compute the opening/income/expense/closing snapshot SERVER-SIDE from the
//      active transactions, so the client can never forge the figures;
//   5. write the immutable report row (insert, or refresh while still
//      'submitted'; a once-'acknowledged' report is frozen).
// The audit_log row is written by the DB audit trigger on sub_account_reports.

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import {
  SUB_ACCOUNT_MANAGER_ROLES,
  adminClient,
  isAssignedToSubAccount,
  resolveCaller,
} from '../_shared/supabase.ts';

const inputSchema = z.object({
  sub_account_id: z.string().uuid(),
  period_year: z.number().int().min(2000).max(2200),
  period_month: z.number().int().min(1).max(12),
});

/** Inclusive-exclusive [first, next] month boundaries as YYYY-MM-DD strings. */
function monthBounds(year: number, month: number): { first: string; next: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const first = `${year}-${pad(month)}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const next = `${nextYear}-${pad(nextMonth)}-01`;
  return { first, next };
}

function sumByDirection(rows: { direction: string; amount: number | string }[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amt = Number(r.amount);
    if (r.direction === 'income') income += amt;
    else expense += amt;
  }
  return { income, expense };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const caller = await resolveCaller(req);
  if (!caller) return errorResponse('Unauthorized', 401);
  if (!SUB_ACCOUNT_MANAGER_ROLES.includes(caller.role)) {
    return errorResponse('Only an assigned Group Financial Secretary may submit a summary.', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return errorResponse('Invalid summary input.', 422);
  const input = parsed.data;

  const assigned = await isAssignedToSubAccount(caller.id, caller.role, input.sub_account_id);
  if (!assigned) {
    return errorResponse('You are not assigned to this sub-account.', 403);
  }

  const admin = adminClient();
  const { first, next } = monthBounds(input.period_year, input.period_month);

  // Opening balance = all active activity strictly BEFORE the month start.
  const { data: priorRows, error: priorErr } = await admin
    .from('sub_account_transactions')
    .select('direction, amount')
    .eq('sub_account_id', input.sub_account_id)
    .eq('is_active', true)
    .lt('txn_date', first);
  if (priorErr) return errorResponse(priorErr.message, 500);
  const prior = sumByDirection(priorRows ?? []);
  const opening = prior.income - prior.expense;

  // This month's activity.
  const { data: monthRows, error: monthErr } = await admin
    .from('sub_account_transactions')
    .select('direction, amount')
    .eq('sub_account_id', input.sub_account_id)
    .eq('is_active', true)
    .gte('txn_date', first)
    .lt('txn_date', next);
  if (monthErr) return errorResponse(monthErr.message, 500);
  const month = sumByDirection(monthRows ?? []);
  const closing = opening + month.income - month.expense;

  const snapshot = {
    sub_account_id: input.sub_account_id,
    period_year: input.period_year,
    period_month: input.period_month,
    opening_balance: opening,
    total_income: month.income,
    total_expense: month.expense,
    closing_balance: closing,
    status: 'submitted',
    submitted_by: caller.id,
    submitted_at: new Date().toISOString(),
  };

  // Refresh while still 'submitted'; a once-'acknowledged' report is frozen.
  const { data: existing, error: existingErr } = await admin
    .from('sub_account_reports')
    .select('id, status')
    .eq('sub_account_id', input.sub_account_id)
    .eq('period_year', input.period_year)
    .eq('period_month', input.period_month)
    .maybeSingle();
  if (existingErr) return errorResponse(existingErr.message, 500);

  if (existing) {
    if (existing.status === 'acknowledged') {
      return errorResponse('This month has already been acknowledged and cannot be changed.', 409);
    }
    const { data: updated, error: updateErr } = await admin
      .from('sub_account_reports')
      .update(snapshot)
      .eq('id', existing.id)
      .select()
      .single();
    if (updateErr || !updated) {
      return errorResponse(updateErr?.message ?? 'Could not update the summary.', 500);
    }
    return jsonResponse(updated, 200);
  }

  const { data: created, error: insertErr } = await admin
    .from('sub_account_reports')
    .insert(snapshot)
    .select()
    .single();
  if (insertErr || !created) {
    return errorResponse(insertErr?.message ?? 'Could not create the summary.', 500);
  }

  return jsonResponse(created, 201);
});
