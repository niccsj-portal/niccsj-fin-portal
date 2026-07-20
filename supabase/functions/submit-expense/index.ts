// @ts-nocheck — Deno runtime; typechecked by `deno check`, not the SPA tsc build.
//
// submit-expense (Sprint 5 story 5.3, PRD §4.4/§6.4)
// ---------------------------------------------------
// Treasurer/Admin submits a new expense:
//   1. verify JWT + role (only EXPENSE_RECORDER_ROLES may submit);
//   2. re-validate the input with the same shape the SPA uses;
//   3. insert the pending expense (submitted_by = caller; status = 'pending');
//   4. fan out one notification row per user in the "notified of expenses" set.
// The audit_log row for the insert is written by the DB audit trigger.

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import {
  EXPENSE_RECORDER_ROLES,
  NOTIFIED_ROLES,
  adminClient,
  resolveCaller,
} from '../_shared/supabase.ts';

const inputSchema = z.object({
  category_id: z.string().uuid(),
  payee: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  amount: z.number().positive(),
  expense_date: z.string().min(1),
  receipt_path: z.string().nullable().optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const caller = await resolveCaller(req);
  if (!caller) return errorResponse('Unauthorized', 401);
  if (!EXPENSE_RECORDER_ROLES.includes(caller.role)) {
    return errorResponse('Only the Treasurer or Admin may submit expenses.', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return errorResponse('Invalid expense input.', 422);
  const input = parsed.data;

  const admin = adminClient();

  // Insert the pending expense. submitted_by/created_by are also stamped by the
  // BEFORE trigger; we set submitted_by explicitly for clarity.
  const { data: expense, error: insertErr } = await admin
    .from('expenses')
    .insert({
      category_id: input.category_id,
      payee: input.payee,
      description: input.description ?? null,
      amount: input.amount,
      expense_date: input.expense_date,
      receipt_path: input.receipt_path ?? null,
      status: 'pending',
      submitted_by: caller.id,
    })
    .select()
    .single();
  if (insertErr || !expense) {
    return errorResponse(insertErr?.message ?? 'Could not create the expense.', 500);
  }

  // Fan out notifications to everyone in the notified set (PRD §7).
  const { data: recipients, error: recipientsErr } = await admin
    .from('users')
    .select('id')
    .in('role', NOTIFIED_ROLES);
  if (!recipientsErr && recipients && recipients.length > 0) {
    const rows = recipients
      .filter((r: { id: string }) => r.id !== caller.id) // don't notify the submitter
      .map((r: { id: string }) => ({ expense_id: expense.id, notified_user_id: r.id }));
    if (rows.length > 0) {
      await admin.from('expense_notifications').insert(rows);
    }
  }

  return jsonResponse(expense, 201);
});
