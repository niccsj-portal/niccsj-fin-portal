import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 1 stories 1.2 / 1.3 / 1.4 / 1.10 — file-level guards for the
 * migrations that follow the initial schema. Same rationale as
 * migrations.initialSchema.test.ts: a fast TDD signal that the committed SQL
 * contains every required object/convention before the cloud `supabase db
 * push` (AR-13). Database-level coverage (pgTAP) lands in Sprint 9.
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

describe('migration 1.2 — roles enum + public.app_role() helper', () => {
  const sql = () => loadMigration('roles_enum_and_helper');

  it('creates the app_role enum with all seven PRD §4.1 roles', () => {
    const s = sql();
    expect(s).toMatch(/create type\s+public\.app_role\s+as enum/);
    for (const role of [
      'member',
      'fin_secretary',
      'treasurer',
      'group_fin_sec',
      'chaplain',
      'finance_council',
      'admin',
    ]) {
      expect(s).toContain(`'${role}'`);
    }
  });

  it('converts users.role to the app_role enum', () => {
    const s = sql();
    expect(s).toMatch(/alter table\s+public\.users\s+alter column role type\s+public\.app_role/);
  });

  it('defines public.app_role() as a security-definer helper', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.app_role\(\)/);
    expect(s).toMatch(/returns\s+public\.app_role/);
    expect(s).toMatch(/security definer/);
  });
});

describe('migration 1.3 — RLS policies for users / members / households', () => {
  const sql = () => loadMigration('rls_policies');

  it.each([['users'], ['members'], ['households']])(
    'creates at least one policy on the %s table',
    (table) => {
      const s = sql();
      expect(s).toMatch(new RegExp(`create policy\\s+\\w+\\s+on\\s+public\\.${table}`));
    },
  );

  it('references public.app_role() so policies key off the caller role', () => {
    expect(sql()).toMatch(/public\.app_role\(\)/);
  });

  it('restricts user-role management to the admin role', () => {
    const s = sql();
    expect(s).toMatch(/users_update_admin/);
    expect(s).toMatch(/'admin'::public\.app_role/);
  });

  it('lets a member read only their own household', () => {
    expect(sql()).toMatch(/members_select_own_household/);
  });
});

describe('migration 1.4 — audit-log trigger framework', () => {
  const sql = () => loadMigration('audit_trigger_framework');

  it('defines a generic, security-definer audit_trigger function', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.audit_trigger\(\)/);
    expect(s).toMatch(/returns trigger/);
    expect(s).toMatch(/security definer/);
  });

  it('captures before/after JSON snapshots', () => {
    const s = sql();
    expect(s).toMatch(/to_jsonb\(old\)/);
    expect(s).toMatch(/to_jsonb\(new\)/);
    expect(s).toMatch(/insert into\s+public\.audit_log/);
  });

  it('exposes an attach helper and wires up existing tables', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.attach_audit_trigger/);
    expect(s).toMatch(/attach_audit_trigger\('public\.members'\)/);
  });
});

describe('migration 1.10 — client_errors / audit_log RLS', () => {
  const sql = () => loadMigration('client_errors_audit_rls');

  it('allows authenticated inserts into client_errors', () => {
    const s = sql();
    expect(s).toMatch(/create policy\s+client_errors_insert_authenticated\s+on\s+public\.client_errors/);
    expect(s).toMatch(/for insert/);
  });

  it('restricts client_errors reads to admins', () => {
    const s = sql();
    expect(s).toMatch(/client_errors_select_admin/);
    expect(s).toMatch(/public\.app_role\(\)\s*=\s*'admin'::public\.app_role/);
  });

  it('restricts audit_log reads to admin / chaplain', () => {
    const s = sql();
    expect(s).toMatch(/audit_log_select_admin/);
    expect(s).toMatch(/'chaplain'::public\.app_role/);
  });
});

describe('migration 1.5 — member-number → email resolution RPC', () => {
  const sql = () => loadMigration('login_member_number_rpc');

  it('defines a security-definer email_for_member_number(integer) function', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.email_for_member_number\(p_member_number integer\)/);
    expect(s).toMatch(/security definer/);
    expect(s).toMatch(/returns text/);
  });

  it('only resolves active members/users and grants execute to anon', () => {
    const s = sql();
    expect(s).toMatch(/m\.is_active/);
    expect(s).toMatch(/u\.is_active/);
    expect(s).toMatch(/grant execute on function public\.email_for_member_number\(integer\) to anon, authenticated/);
  });
});
