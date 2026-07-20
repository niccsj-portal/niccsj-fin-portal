// @ts-nocheck — Deno runtime; typechecked by `deno check`, not the SPA tsc build.
//
// reject-expense (Sprint 5 story 5.4, PRD §4.4/§6.4)
// ---------------------------------------------------
// Chaplain/Admin rejects a pending expense WITH a mandatory reason:
//   1. verify JWT + role (only EXPENSE_APPROVER_ROLES may reject);
//   2. require a non-empty rejection reason (PRD §4.4 step 3);
//   3. ensure the expense is still pending;
//   4. flip status → 'rejected', store the reason, stamp approved_by + decided_at.
// The audit_log row for the status change is written by the DB audit trigger.

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { EXPENSE_APPROVER_ROLES, adminClient, resolveCaller } from '../_shared/supabase.ts';

const inputSchema = z.object({
  expense_id: z.string().uuid(),
  reason: z.string().trim().min(1),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const caller = await resolveCaller(req);
  if (!caller) return errorResponse('Unauthorized', 401);
  if (!EXPENSE_APPROVER_ROLES.includes(caller.role)) {
    return errorResponse('Only the Chaplain or Admin may reject expenses.', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('A rejection reason is required.', 422);
  }

  const admin = adminClient();

  const { data: existing, error: readErr } = await admin
    .from('expenses')
    .select('id, status')
    .eq('id', parsed.data.expense_id)
    .single();
  if (readErr || !existing) return errorResponse('Expense not found.', 404);
  if (existing.status !== 'pending') {
    return errorResponse(`Expense is already ${existing.status}.`, 409);
  }

  const { data: updated, error: updateErr } = await admin
    .from('expenses')
    .update({
      status: 'rejected',
      rejection_reason: parsed.data.reason,
      approved_by: caller.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.expense_id)
    .select()
    .single();
  if (updateErr || !updated) {
    return errorResponse(updateErr?.message ?? 'Could not reject the expense.', 500);
  }

  return jsonResponse(updated, 200);
});
