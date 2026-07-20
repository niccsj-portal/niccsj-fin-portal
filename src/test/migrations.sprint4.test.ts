import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 4 story 4.1 — file-level guards for the contributions ledger
 * migration. Same rationale as the Sprint 1/2 parse tests: a fast TDD signal
 * that the committed SQL contains every required object before the cloud
 * `supabase db push`. Database-level coverage (pgTAP) lands in Sprint 9.
 *
 * References:
 *   * PRD §4.3   contribution categories + recording rules
 *   * PRD §6.3   contributions / categories data model
 *   * PRD §7     "Record contribution (main ledger)" = FS, Treasurer, Admin
 *   * backlog §4.5 story 4.1
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

describe('migration 4.1 — contributions table', () => {
  const sql = () => loadMigration('contributions');

  it('creates public.contributions', () => {
    expect(sql()).toMatch(/create table if not exists\s+public\.contributions/);
  });

  it('stores money as numeric(12,2) (PRD §6.3 convention)', () => {
    expect(sql()).toMatch(/amount\s+numeric\(12,\s*2\)/);
  });

  it('uses timestamptz default now() and a date column', () => {
    const s = sql();
    expect(s).toMatch(/created_at\s+timestamptz not null default now\(\)/);
    expect(s).toMatch(/contribution_date\s+date/);
  });

  it('references members, households, categories and auth.users', () => {
    const s = sql();
    expect(s).toMatch(/references\s+public\.members/);
    expect(s).toMatch(/references\s+public\.households/);
    expect(s).toMatch(/references\s+public\.categories/);
    expect(s).toMatch(/references\s+auth\.users/);
  });

  it('soft-deletes via is_active (no hard deletes on financial rows)', () => {
    expect(sql()).toMatch(/is_active\s+boolean not null default true/);
  });

  it('constrains payment_method to a known set', () => {
    const s = sql();
    expect(s).toMatch(/payment_method/);
    for (const method of ['cash', 'check', 'zelle', 'other']) {
      expect(s).toContain(`'${method}'`);
    }
  });

  it('enables row level security on contributions', () => {
    expect(sql()).toMatch(/alter table\s+public\.contributions\s+enable row level security/);
  });
});

describe('migration 4.1 — contributions RLS (PRD §7)', () => {
  const sql = () => loadMigration('contributions');

  it('defines is_contribution_recorder() limited to FS / Treasurer / Admin', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.is_contribution_recorder\(\)/);
    expect(s).toContain("'fin_secretary'::public.app_role");
    expect(s).toContain("'treasurer'::public.app_role");
    expect(s).toContain("'admin'::public.app_role");
    // Chaplain may NOT record on the main ledger (PRD §7).
    expect(s).not.toMatch(/is_contribution_recorder[\s\S]*?'chaplain'::public\.app_role[\s\S]*?\$\$/);
  });

  it('lets a household read its own contributions', () => {
    const s = sql();
    expect(s).toMatch(/create policy contributions_select_own_household/);
    expect(s).toMatch(/household_id\s*=\s*public\.caller_household_id\(\)/);
  });

  it('lets privileged readers see every contribution', () => {
    const s = sql();
    expect(s).toMatch(/create policy contributions_select_privileged/);
    expect(s).toMatch(/public\.is_privileged_reader\(\)/);
  });

  it('lets only recorders insert and update', () => {
    const s = sql();
    expect(s).toMatch(/create policy contributions_insert_recorder/);
    expect(s).toMatch(/create policy contributions_update_recorder/);
    expect(s).toMatch(/public\.is_contribution_recorder\(\)/);
  });
});

describe('migration 4.1 — audit + category seed', () => {
  const sql = () => loadMigration('contributions_and_categories');

  it('attaches the audit trigger to contributions', () => {
    expect(sql()).toMatch(/attach_audit_trigger\('public\.contributions'\)/);
  });

  it('stamps created_by / updated_by via a before trigger (PRD §6.3)', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.set_contribution_actor\(\)/);
    expect(s).toMatch(/new\.created_by\s*:=\s*auth\.uid\(\)/);
    expect(s).toMatch(/new\.updated_by\s*:=\s*auth\.uid\(\)/);
    expect(s).toMatch(/before insert or update on public\.contributions/);
  });

  it('seeds the standard contribution categories (PRD §4.3)', () => {
    const s = sql();
    for (const name of [
      'cmo dues',
      'cwo dues',
      'harvest',
      'building fund',
      'donations',
      'offertory',
    ]) {
      expect(s).toContain(name);
    }
  });

  it('seeds the legacy household dues category recordable but phase-out ready', () => {
    expect(sql()).toMatch(/household dues/);
  });

  it('wraps the migration in a transaction', () => {
    const s = sql();
    expect(s).toMatch(/^begin;/m);
    expect(s).toMatch(/commit;\s*$/);
  });
});

describe('migration 4.5 — correction reason column', () => {
  const sql = () => loadMigration('contribution_correction_reason');

  it('adds a nullable correction_reason column to contributions', () => {
    expect(sql()).toMatch(
      /alter table\s+public\.contributions\s+add column if not exists correction_reason text/,
    );
  });

  it('wraps the migration in a transaction', () => {
    const s = sql();
    expect(s).toMatch(/^begin;/m);
    expect(s).toMatch(/commit;\s*$/);
  });
});

describe('migration — categories RLS policies (dropdown fix)', () => {
  const sql = () => loadMigration('categories_rls');

  it('lets any authenticated user read categories', () => {
    expect(sql()).toMatch(/create policy\s+categories_select_authenticated/);
    expect(sql()).toMatch(/for select[\s\S]*using \(true\)/);
  });

  it('restricts category inserts to recorders (story 4.3)', () => {
    expect(sql()).toMatch(/create policy\s+categories_insert_recorder/);
    expect(sql()).toMatch(/with check \(public\.is_contribution_recorder\(\)\)/);
  });

  it('restricts category updates to recorders', () => {
    expect(sql()).toMatch(/create policy\s+categories_update_recorder/);
  });

  it('wraps the categories policy migration in a transaction', () => {
    const s = sql();
    expect(s).toMatch(/^begin;/m);
    expect(s).toMatch(/commit;\s*$/);
  });
});
