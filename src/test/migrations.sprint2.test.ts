import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 2 story 2.1 — file-level guards for the member_number generator
 * migration. Same rationale as the Sprint 1 parse tests: a fast TDD signal
 * that the committed SQL contains every required object before the cloud
 * `supabase db push`. Database-level coverage (pgTAP) lands in Sprint 9.
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

describe('migration 2.1 — member_number generator + baptism_status', () => {
  const sql = () => loadMigration('member_number_generator');

  it('adds the optional baptism_status column with a check constraint', () => {
    const s = sql();
    expect(s).toMatch(/alter table\s+public\.members\s+add column if not exists baptism_status/);
    for (const value of ['baptized', 'not_baptized', 'unknown']) {
      expect(s).toContain(`'${value}'`);
    }
  });

  it('defines next_member_number() returning integer as security definer', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.next_member_number\(\)/);
    expect(s).toMatch(/returns\s+integer/);
    expect(s).toMatch(/security definer/);
  });

  it('suggests max + 1 from members', () => {
    expect(sql()).toMatch(/coalesce\(max\(member_number\),\s*0\)\s*\+\s*1/);
  });

  it('grants execute to authenticated and revokes from public', () => {
    const s = sql();
    expect(s).toMatch(/revoke all on function\s+public\.next_member_number\(\)\s+from public/);
    expect(s).toMatch(/grant execute on function\s+public\.next_member_number\(\)\s+to authenticated/);
  });

  it('wraps the migration in a transaction', () => {
    const s = sql();
    expect(s).toMatch(/^begin;/m);
    expect(s).toMatch(/commit;\s*$/);
  });
});

describe('story 2.7 — member + household mutations are audited', () => {
  // Story 2.7 has no new client code: the audit_log rows are written by the
  // story 1.4 generic trigger, which must be attached to both tables Sprint 2
  // mutates. This guards that contract so an import / edit always leaves a
  // trail (PRD §5 auditability).
  const audit = () => loadMigration('audit_trigger_framework');

  it('attaches the audit trigger to public.members', () => {
    expect(audit()).toMatch(/attach_audit_trigger\('public\.members'\)/);
  });

  it('attaches the audit trigger to public.households', () => {
    expect(audit()).toMatch(/attach_audit_trigger\('public\.households'\)/);
  });

  it('audits inserts, updates, and deletes', () => {
    expect(audit()).toMatch(/after insert or update or delete/);
  });
});
