import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 9 story 9.7 — file-level guards for the pgTAP RLS policy suite.
 * The suite runs in Postgres (via `supabase test db` or `npm run test:rls`),
 * not Node, so here we assert the committed SQL still authenticates as each
 * PRD §4.1 role and covers the hard PRD §7 boundaries — a fast regression net
 * that fails if a boundary assertion is accidentally dropped.
 */
const suite = readFileSync(
  path.resolve(__dirname, '../../supabase/tests/rls_policies.test.sql'),
  'utf8',
);

describe('RLS pgTAP suite (story 9.7)', () => {
  it('runs inside a rolled-back transaction and finishes cleanly', () => {
    expect(suite).toMatch(/^\s*begin;/im);
    expect(suite).toMatch(/rollback;\s*$/i);
    expect(suite).toMatch(/select \* from finish\(\)/i);
    expect(suite).toMatch(/create extension if not exists pgtap/i);
  });

  it('impersonates via the JWT sub claim and engages RLS as authenticated', () => {
    expect(suite).toMatch(/request\.jwt\.claims/);
    expect(suite).toMatch(/set local role authenticated/i);
    expect(suite).toMatch(/tests\.login\(/);
  });

  it('covers member-directory visibility + editor-only writes', () => {
    expect(suite).toMatch(/member sees only their own household members/i);
    expect(suite).toMatch(/privileged reader\) sees every member/i);
    expect(suite).toMatch(/Treasurer may NOT create a member/i);
  });

  it('covers the aggregate-only Finance Council boundary', () => {
    expect(suite).toMatch(/Finance Council is NOT a per-member reader/i);
    expect(suite).toMatch(/Finance Council sees NO per-member contribution rows/i);
  });

  it('covers contribution recorder rules (Chaplain reads but cannot record)', () => {
    expect(suite).toMatch(/Treasurer may record a contribution/i);
    expect(suite).toMatch(/Chaplain may NOT record on the main ledger/i);
    expect(suite).toMatch(/Member may NOT record a contribution/i);
  });

  it('covers expense submit + approver rules', () => {
    expect(suite).toMatch(/Treasurer may submit an expense/i);
    expect(suite).toMatch(/Financial Secretary may NOT submit an expense/i);
    expect(suite).toMatch(/Chaplain \(approver\) may update an expense/i);
  });

  it('covers sub-account group isolation', () => {
    expect(suite).toMatch(/Group FS \(CMO\) sees only their own group/i);
    expect(suite).toMatch(/Group FS \(CMO\) may NOT record into another group/i);
    expect(suite).toMatch(/overseer\) sees every group/i);
  });

  it('covers admin-only surfaces: roles, audit log, assignments', () => {
    expect(suite).toMatch(/Treasurer cannot change another user/i);
    expect(suite).toMatch(/Admin may change a user/i);
    expect(suite).toMatch(/Admin may read the audit log/i);
    expect(suite).toMatch(/Member may NOT read the audit log/i);
    expect(suite).toMatch(/Admin may assign a Group FS to a sub-account/i);
    expect(suite).toMatch(/Treasurer may NOT manage sub-account assignments/i);
  });
});
