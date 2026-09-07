import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * File-level guards for the sub-account member-dues follow-up migration
 * (`*sub_account_member_dues*.sql`). Same rationale as the Sprint 1/2/4/5/6
 * parse tests: a fast TDD signal that the committed SQL contains every required
 * object before the cloud `supabase db push`.
 *
 * References:
 *   * PRD §4.5   group dues belong to a member (member-facing visibility)
 *   * PRD §7     a Group FS only sees their own group's categories
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

describe('migration — sub_account_transactions.member_id', () => {
  const sql = () => loadMigration('sub_account_member_dues');

  it('adds an optional member_id FK that survives a member delete', () => {
    const s = sql();
    expect(s).toMatch(
      /alter table\s+public\.sub_account_transactions\s+add column if not exists member_id uuid references public\.members\(id\) on delete set null/,
    );
  });

  it('indexes member_id for the member-facing lookup', () => {
    expect(sql()).toMatch(/create index if not exists sub_account_transactions_member_idx/);
  });
});

describe('migration — sub_account_categories mapping', () => {
  const sql = () => loadMigration('sub_account_member_dues');

  it('creates the mapping table with a unique (sub_account, category)', () => {
    const s = sql();
    expect(s).toMatch(/create table if not exists\s+public\.sub_account_categories/);
    expect(s).toMatch(/sub_account_id\s+uuid not null references public\.sub_accounts\(id\)/);
    expect(s).toMatch(/category_id\s+uuid not null references public\.categories\(id\)/);
    expect(s).toMatch(/unique\s*\(\s*sub_account_id,\s*category_id\s*\)/);
  });

  it('enables RLS: read for authenticated, write for admin', () => {
    const s = sql();
    expect(s).toMatch(/alter table\s+public\.sub_account_categories\s+enable row level security/);
    expect(s).toMatch(/create policy sub_account_categories_select/);
    expect(s).toMatch(/create policy sub_account_categories_insert_admin/);
  });

  it('seeds each group its own dues plus donations', () => {
    const s = sql();
    expect(s).toMatch(/insert into public\.sub_account_categories/);
    expect(s).toContain("'cmo dues'");
    expect(s).toContain("'cwo dues'");
    expect(s).toContain("'donations'");
    expect(s).toMatch(/on conflict\s*\(\s*sub_account_id,\s*category_id\s*\)\s*do nothing/);
  });
});

describe('migration — member self visibility of group dues', () => {
  const sql = () => loadMigration('sub_account_member_dues');

  it('defines caller_member_id() as a security-definer helper', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.caller_member_id\(\)/);
    expect(s).toMatch(/security definer/);
    expect(s).toMatch(/set search_path = public, pg_temp/);
  });

  it('opens a member-scoped select on transactions and the parent group', () => {
    const s = sql();
    expect(s).toMatch(/create policy sub_account_transactions_select_own_member/);
    expect(s).toMatch(/member_id = public\.caller_member_id\(\)/);
    expect(s).toMatch(/create policy sub_accounts_select_member_dues/);
  });
});

describe('migration — Group FS member/household read access', () => {
  const sql = () => loadMigration('group_fs_member_read');

  it('defines is_sub_account_manager() for the group_fin_sec role', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.is_sub_account_manager\(\)/);
    expect(s).toContain("'group_fin_sec'::public.app_role");
    expect(s).toMatch(/set search_path = public, pg_temp/);
  });

  it('adds SELECT policies on members and households for the manager', () => {
    const s = sql();
    expect(s).toMatch(/create policy members_select_sub_account_manager on public\.members/);
    expect(s).toMatch(/create policy households_select_sub_account_manager on public\.households/);
    expect(s).toMatch(/using \(public\.is_sub_account_manager\(\)\)/);
  });

  it('does not widen the contributions ledger policy', () => {
    expect(sql()).not.toContain('public.contributions');
  });
});
