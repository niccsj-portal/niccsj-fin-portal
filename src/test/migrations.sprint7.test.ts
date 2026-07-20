import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 7 story 7.2 — file-level guards for the aggregate reporting RPC
 * migration. Same rationale as the Sprint 1/2/4/5/6 parse tests: a fast TDD
 * signal that the committed SQL contains every required object (and none of the
 * forbidden ones) before the cloud apply. The security property under test is
 * PRD §7: the Finance Council must obtain aggregates WITHOUT any per-member or
 * per-household column leaving the database.
 *
 * References:
 *   * PRD §4.6   reports + Council oversight dashboard
 *   * PRD §7     Council sees aggregate figures only
 *   * backlog §4.8 / PM.md §5G stories 7.2 + 7.5
 */

const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');

function loadMigration(fragment: string): string {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  const match = files.find((f) => f.includes(fragment));
  if (!match) {
    throw new Error(
      `No "*${fragment}*.sql" file under supabase/migrations/. Found: ${files.join(', ') || '(empty)'}`,
    );
  }
  return readFileSync(path.join(migrationsDir, match), 'utf8').toLowerCase();
}

describe('migration 7.2 — aggregate reporting RPCs', () => {
  const sql = () => loadMigration('report_aggregates');

  it('defines the three aggregate RPCs', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.report_income_by_category/);
    expect(s).toMatch(/create or replace function\s+public\.report_income_monthly/);
    expect(s).toMatch(/create or replace function\s+public\.report_participation/);
  });

  it('runs each function as security definer with a pinned search_path', () => {
    const s = sql();
    const definers = s.match(/security definer/g) ?? [];
    expect(definers.length).toBeGreaterThanOrEqual(3);
    const paths = s.match(/set search_path = public, pg_temp/g) ?? [];
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it('gates every function to the leadership set via is_expense_reader()', () => {
    const s = sql();
    const gates = s.match(/if not public\.is_expense_reader\(\) then/g) ?? [];
    expect(gates.length).toBe(3);
  });

  it('grants execute to authenticated only (revoked from public)', () => {
    const s = sql();
    expect(s).toMatch(/revoke all on function public\.report_income_by_category/);
    expect(s).toMatch(/grant execute on function public\.report_income_by_category\(date, date\) to authenticated/);
    expect(s).toMatch(/grant execute on function public\.report_income_monthly\(integer\) to authenticated/);
    expect(s).toMatch(/grant execute on function public\.report_participation\(date, date\) to authenticated/);
  });

  it('participation counts DISTINCT households — an aggregate, not rows', () => {
    expect(sql()).toMatch(/count\(distinct c\.household_id\)/);
  });

  it('returns only aggregate columns — never a member_id / household_id column', () => {
    const s = sql();
    // The `returns table (...)` signatures must not expose per-entity ids.
    const signatures = s.match(/returns table \([^)]*\)/g) ?? [];
    expect(signatures.length).toBeGreaterThanOrEqual(3);
    for (const sig of signatures) {
      expect(sig).not.toContain('member_id');
      expect(sig).not.toContain('household_id');
    }
  });
});
