import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 5 stories 5.3/5.4/5.9 — file-level guards for the expense-workflow
 * Edge Functions. These run under Deno in Supabase, so they can't execute in
 * the Vitest/Node environment; instead we assert the committed source enforces
 * the security rules (role checks, mandatory reason, status guards). Runtime
 * behaviour is exercised manually on deploy and by `deno check`.
 *
 * References: technology.md §7 (verify JWT + role, re-validate inputs, audit),
 * PRD §4.4/§6.4, §7.
 */

const functionsDir = path.resolve(__dirname, '../../supabase/functions');

function loadFn(name: string): string {
  return readFileSync(path.join(functionsDir, name, 'index.ts'), 'utf8');
}

describe('submit-expense (story 5.3)', () => {
  const src = loadFn('submit-expense');

  it('restricts submission to expense recorders (Treasurer/Admin)', () => {
    expect(src).toMatch(/EXPENSE_RECORDER_ROLES\.includes\(caller\.role\)/);
    expect(src).toMatch(/return errorResponse\([^)]*403\)/);
  });

  it('re-validates the input with a zod schema', () => {
    expect(src).toMatch(/inputSchema\.safeParse/);
    expect(src).toMatch(/z\.object\(/);
  });

  it('creates a pending expense stamped with the caller as submitter', () => {
    expect(src).toMatch(/status:\s*'pending'/);
    expect(src).toMatch(/submitted_by:\s*caller\.id/);
  });

  it('fans out notifications to the notified set, excluding the submitter', () => {
    expect(src).toMatch(/expense_notifications/);
    expect(src).toMatch(/NOTIFIED_ROLES/);
    expect(src).toMatch(/r\.id\s*!==\s*caller\.id/);
  });
});

describe('approve-expense (story 5.4)', () => {
  const src = loadFn('approve-expense');

  it('restricts approval to approvers (Chaplain/Admin)', () => {
    expect(src).toMatch(/EXPENSE_APPROVER_ROLES\.includes\(caller\.role\)/);
    expect(src).toMatch(/return errorResponse\([^)]*403\)/);
  });

  it('only acts on a still-pending expense', () => {
    expect(src).toMatch(/status\s*!==\s*'pending'/);
  });

  it('flips status to approved and records approver + timestamp', () => {
    expect(src).toMatch(/status:\s*'approved'/);
    expect(src).toMatch(/approved_by:\s*caller\.id/);
    expect(src).toMatch(/decided_at/);
  });
});

describe('reject-expense (story 5.4)', () => {
  const src = loadFn('reject-expense');

  it('restricts rejection to approvers (Chaplain/Admin)', () => {
    expect(src).toMatch(/EXPENSE_APPROVER_ROLES\.includes\(caller\.role\)/);
  });

  it('requires a non-empty rejection reason (PRD §4.4)', () => {
    expect(src).toMatch(/reason:\s*z\.string\(\)\.trim\(\)\.min\(1\)/);
  });

  it('flips status to rejected and stores the reason', () => {
    expect(src).toMatch(/status:\s*'rejected'/);
    expect(src).toMatch(/rejection_reason:\s*parsed\.data\.reason/);
  });
});

describe('shared edge-function helpers', () => {
  const shared = readFileSync(path.join(functionsDir, '_shared', 'supabase.ts'), 'utf8');

  it('verifies the caller JWT and resolves their role from public.users', () => {
    expect(shared).toMatch(/auth\.getUser\(\)/);
    expect(shared).toMatch(/from\('users'\)[\s\S]*?\.select\('role'\)/);
  });

  it('keeps the recorder and approver role sets disjoint (no self-approval)', () => {
    expect(shared).toMatch(/EXPENSE_RECORDER_ROLES[^=]*=\s*\['treasurer', 'admin'\]/);
    expect(shared).toMatch(/EXPENSE_APPROVER_ROLES[^=]*=\s*\['chaplain', 'admin'\]/);
  });
});
