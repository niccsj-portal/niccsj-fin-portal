import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 6 story 6.1 — file-level guards for the sub-account schema migration.
 * Same rationale as the Sprint 1/2/4/5 parse tests: a fast TDD signal that the
 * committed SQL contains every required object before the cloud
 * `supabase db push`. Database-level coverage (pgTAP) lands in Sprint 9.
 *
 * References:
 *   * PRD §4.5   group sub-account ledger + monthly summary
 *   * PRD §6.3   sub-account data model + conventions
 *   * PRD §7     Group FS sees only their own group
 *   * backlog §4.7 stories 6.1 / 6.2
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

/** Slice a function body: from its `create or replace function` to the next `$$;`. */
function functionBody(sql: string, name: string): string {
  const idx = sql.search(new RegExp(`create or replace function\\s+public\\.${name}\\(\\)`));
  if (idx === -1) throw new Error(`function ${name} not found`);
  const end = sql.indexOf('$$;', idx);
  return sql.slice(idx, end === -1 ? undefined : end);
}

describe('migration 6.1 — sub_accounts table', () => {
  const sql = () => loadMigration('sub_accounts');

  it('creates public.sub_accounts', () => {
    expect(sql()).toMatch(/create table if not exists\s+public\.sub_accounts/);
  });

  it('keeps a unique slug + a name', () => {
    const s = sql();
    expect(s).toMatch(/slug\s+text not null unique/);
    expect(s).toMatch(/name\s+text not null/);
  });

  it('soft-deletes via is_active and timestamps with timestamptz default now()', () => {
    const s = sql();
    expect(s).toMatch(/is_active\s+boolean not null default true/);
    expect(s).toMatch(/created_at\s+timestamptz not null default now\(\)/);
  });

  it('seeds the CMO and CWO sub-accounts idempotently', () => {
    const s = sql();
    expect(s).toMatch(/insert into public\.sub_accounts/);
    expect(s).toContain("'cmo'");
    expect(s).toContain("'cwo'");
    expect(s).toMatch(/on conflict\s*\(\s*slug\s*\)\s*do nothing/);
  });
});

describe('migration 6.1 — sub_account_users assignment table', () => {
  const sql = () => loadMigration('sub_accounts');

  it('creates public.sub_account_users referencing sub_accounts + auth.users', () => {
    const s = sql();
    expect(s).toMatch(/create table if not exists\s+public\.sub_account_users/);
    expect(s).toMatch(/sub_account_id\s+uuid not null references public\.sub_accounts\(id\) on delete cascade/);
    expect(s).toMatch(/user_id\s+uuid not null references auth\.users\(id\) on delete cascade/);
  });

  it('is unique per (sub_account, user)', () => {
    expect(sql()).toMatch(/unique\s*\(\s*sub_account_id,\s*user_id\s*\)/);
  });
});

describe('migration 6.1 — caller_sub_account_ids() scoping helper', () => {
  const sql = () => loadMigration('sub_accounts');

  it('defines caller_sub_account_ids() as a security-definer set function', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.caller_sub_account_ids\(\)/);
    expect(s).toMatch(/returns setof uuid/);
    expect(s).toMatch(/security definer/);
  });

  it('resolves the caller via sub_account_users + auth.uid()', () => {
    const body = functionBody(sql(), 'caller_sub_account_ids');
    expect(body).toContain('public.sub_account_users');
    expect(body).toContain('auth.uid()');
  });

  it('defines is_sub_account_overseer() for the read-all rollup set', () => {
    const body = functionBody(sql(), 'is_sub_account_overseer');
    for (const role of ['fin_secretary', 'treasurer', 'finance_council', 'admin']) {
      expect(body).toContain(`'${role}'::public.app_role`);
    }
  });
});

describe('migration 6.1 — sub_account_transactions table', () => {
  const sql = () => loadMigration('sub_accounts');

  it('creates public.sub_account_transactions scoped to a sub_account', () => {
    const s = sql();
    expect(s).toMatch(/create table if not exists\s+public\.sub_account_transactions/);
    expect(s).toMatch(/sub_account_id\s+uuid not null references public\.sub_accounts/);
  });

  it('stores money as numeric(12,2) > 0 and a direction check', () => {
    const s = sql();
    expect(s).toMatch(/amount\s+numeric\(12,\s*2\)\s+not null check \(amount > 0\)/);
    expect(s).toMatch(/direction\s+text not null/);
    for (const d of ['income', 'expense']) {
      expect(s).toContain(`'${d}'`);
    }
  });

  it('soft-deletes via is_active and stamps actors', () => {
    const s = sql();
    expect(s).toMatch(/is_active\s+boolean not null default true/);
    expect(s).toMatch(/created_by\s+uuid references auth\.users/);
    expect(s).toMatch(/create or replace function\s+public\.set_sub_account_txn_actor\(\)/);
    expect(s).toMatch(/before insert or update on public\.sub_account_transactions/);
  });
});

describe('migration 6.1 — sub_account_reports table', () => {
  const sql = () => loadMigration('sub_accounts');

  it('creates an immutable monthly snapshot table', () => {
    const s = sql();
    expect(s).toMatch(/create table if not exists\s+public\.sub_account_reports/);
    expect(s).toMatch(/opening_balance\s+numeric\(12,\s*2\)/);
    expect(s).toMatch(/total_income\s+numeric\(12,\s*2\)/);
    expect(s).toMatch(/total_expense\s+numeric\(12,\s*2\)/);
    expect(s).toMatch(/closing_balance\s+numeric\(12,\s*2\)/);
  });

  it('is unique per (sub_account, year, month) and tracks a status', () => {
    const s = sql();
    expect(s).toMatch(/unique\s*\(\s*sub_account_id,\s*period_year,\s*period_month\s*\)/);
    for (const status of ['submitted', 'acknowledged']) {
      expect(s).toContain(`'${status}'`);
    }
  });
});

describe('migration 6.1 — RLS (group isolation, PRD §7)', () => {
  const sql = () => loadMigration('sub_accounts');

  it('enables RLS on every sub-account table', () => {
    const s = sql();
    for (const t of [
      'sub_accounts',
      'sub_account_users',
      'sub_account_transactions',
      'sub_account_reports',
    ]) {
      expect(s).toMatch(new RegExp(`alter table\\s+public\\.${t}\\s+enable row level security`));
    }
  });

  it('scopes transaction reads to the caller assignment or overseers', () => {
    const s = sql();
    expect(s).toMatch(/create policy sub_account_transactions_select/);
    expect(s).toMatch(/public\.caller_sub_account_ids\(\)/);
    expect(s).toMatch(/public\.is_sub_account_overseer\(\)/);
  });

  it('lets only the assigned manager insert transactions for their group', () => {
    const s = sql();
    expect(s).toMatch(/create policy sub_account_transactions_insert/);
    expect(s).toMatch(/sub_account_id in \(select public\.caller_sub_account_ids\(\)\)/);
  });

  it('restricts sub_account_users management to admins', () => {
    expect(sql()).toMatch(/create policy sub_account_users_/);
  });
});

describe('migration 6.1 — audit', () => {
  const sql = () => loadMigration('sub_accounts');

  it('attaches the audit trigger to transactions and reports', () => {
    const s = sql();
    expect(s).toMatch(/attach_audit_trigger\('public\.sub_account_transactions'\)/);
    expect(s).toMatch(/attach_audit_trigger\('public\.sub_account_reports'\)/);
  });
});
