import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 6 story 6.4 — file-level guards for the submit-sub-account-report Edge
 * Function. It runs under Deno in Supabase, so we assert the committed source
 * enforces the security rules (role + assignment checks, server-side snapshot,
 * acknowledged-freeze). Runtime behaviour is exercised on deploy + `deno check`.
 *
 * References: technology.md §7, PRD §4.5/§6.4, §7 (group isolation).
 */

const functionsDir = path.resolve(__dirname, '../../supabase/functions');

function loadFn(name: string): string {
  return readFileSync(path.join(functionsDir, name, 'index.ts'), 'utf8');
}

describe('submit-sub-account-report (story 6.4)', () => {
  const src = loadFn('submit-sub-account-report');

  it('restricts submission to sub-account managers (Group FS/Admin)', () => {
    expect(src).toMatch(/SUB_ACCOUNT_MANAGER_ROLES\.includes\(caller\.role\)/);
    expect(src).toMatch(/return errorResponse\([^)]*403\)/);
  });

  it('enforces the caller is ASSIGNED to the sub-account (group isolation)', () => {
    expect(src).toMatch(/isAssignedToSubAccount\(/);
    expect(src).toMatch(/not assigned to this sub-account/i);
  });

  it('re-validates the input with a zod schema', () => {
    expect(src).toMatch(/inputSchema\.safeParse/);
    expect(src).toMatch(/period_month:\s*z\.number\(\)\.int\(\)\.min\(1\)\.max\(12\)/);
  });

  it('computes the opening/income/expense/closing snapshot server-side', () => {
    expect(src).toMatch(/opening_balance:\s*opening/);
    expect(src).toMatch(/closing\s*=\s*opening\s*\+\s*month\.income\s*-\s*month\.expense/);
    expect(src).toMatch(/is_active/); // only active rows feed the snapshot
  });

  it('freezes a report once it is acknowledged', () => {
    expect(src).toMatch(/status\s*===\s*'acknowledged'/);
    expect(src).toMatch(/return errorResponse\([^)]*409\)/);
  });
});

describe('shared edge-function helpers — sub-account assignment', () => {
  const shared = readFileSync(path.join(functionsDir, '_shared', 'supabase.ts'), 'utf8');

  it('limits sub-account managers to Group FS + Admin', () => {
    expect(shared).toMatch(/SUB_ACCOUNT_MANAGER_ROLES[^=]*=\s*\['group_fin_sec', 'admin'\]/);
  });

  it('checks assignment against sub_account_users (admin bypass)', () => {
    expect(shared).toMatch(/from\('sub_account_users'\)/);
    expect(shared).toMatch(/if \(role === 'admin'\) return true/);
  });
});
