import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 5 story 5.1 — file-level guards for the expenses + notifications
 * migration. Same rationale as the Sprint 1/2/4 parse tests: a fast TDD signal
 * that the committed SQL contains every required object before the cloud
 * `supabase db push`. Database-level coverage (pgTAP) lands in Sprint 9.
 *
 * References:
 *   * PRD §4.4   expense recording + approval workflow
 *   * PRD §6.3   expenses / expense_notifications data model
 *   * PRD §7     Submit = Treasurer/Admin; Approve/reject = Chaplain/Admin
 *   * backlog §4.6 story 5.1
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

describe('migration 5.1 — expenses table', () => {
  const sql = () => loadMigration('expenses_and_notifications');

  it('creates public.expenses', () => {
    expect(sql()).toMatch(/create table if not exists\s+public\.expenses/);
  });

  it('stores money as numeric(12,2) (PRD §6.3 convention)', () => {
    expect(sql()).toMatch(/amount\s+numeric\(12,\s*2\)/);
  });

  it('uses timestamptz default now() and a date column', () => {
    const s = sql();
    expect(s).toMatch(/created_at\s+timestamptz not null default now\(\)/);
    expect(s).toMatch(/expense_date\s+date/);
  });

  it('references categories and auth.users', () => {
    const s = sql();
    expect(s).toMatch(/references\s+public\.categories/);
    expect(s).toMatch(/references\s+auth\.users/);
  });

  it('constrains status to pending/approved/rejected, default pending', () => {
    const s = sql();
    expect(s).toMatch(/status\s+text not null default 'pending'/);
    for (const status of ['pending', 'approved', 'rejected']) {
      expect(s).toContain(`'${status}'`);
    }
  });

  it('records workflow actors (submitted_by, approved_by, decided_at)', () => {
    const s = sql();
    expect(s).toMatch(/submitted_by\s+uuid/);
    expect(s).toMatch(/approved_by\s+uuid/);
    expect(s).toMatch(/decided_at\s+timestamptz/);
  });

  it('keeps a receipt_path for the private Storage object', () => {
    expect(sql()).toMatch(/receipt_path\s+text/);
  });

  it('requires a reason when rejected (PRD §4.4)', () => {
    expect(sql()).toMatch(
      /check\s*\(\s*status\s*<>\s*'rejected'\s+or\s+rejection_reason\s+is not null\s*\)/,
    );
  });

  it('soft-deletes via is_active (no hard deletes on financial rows)', () => {
    expect(sql()).toMatch(/is_active\s+boolean not null default true/);
  });

  it('enables row level security on expenses', () => {
    expect(sql()).toMatch(/alter table\s+public\.expenses\s+enable row level security/);
  });
});

/** Slice a function body: from its `create or replace function` to the next `$$;`. */
function functionBody(sql: string, name: string): string {
  const idx = sql.search(new RegExp(`create or replace function\\s+public\\.${name}\\(\\)`));
  if (idx === -1) throw new Error(`function ${name} not found`);
  const end = sql.indexOf('$$;', idx);
  return sql.slice(idx, end === -1 ? undefined : end);
}

describe('migration 5.1 — expense role predicates (PRD §7)', () => {
  const sql = () => loadMigration('expenses_and_notifications');

  it('defines is_expense_recorder() limited to Treasurer / Admin', () => {
    const body = functionBody(sql(), 'is_expense_recorder');
    expect(body).toContain("'treasurer'::public.app_role");
    expect(body).toContain("'admin'::public.app_role");
    // A submitter is not the FS or Chaplain.
    expect(body).not.toContain("'chaplain'::public.app_role");
    expect(body).not.toContain("'fin_secretary'::public.app_role");
  });

  it('defines is_expense_approver() limited to Chaplain / Admin', () => {
    const body = functionBody(sql(), 'is_expense_approver');
    expect(body).toContain("'chaplain'::public.app_role");
    expect(body).toContain("'admin'::public.app_role");
    // The Treasurer submits but may NOT approve their own expense.
    expect(body).not.toContain("'treasurer'::public.app_role");
  });

  it('defines is_expense_reader() for the "notified of expenses" set', () => {
    const body = functionBody(sql(), 'is_expense_reader');
    for (const role of ['fin_secretary', 'treasurer', 'chaplain', 'finance_council', 'admin']) {
      expect(body).toContain(`'${role}'::public.app_role`);
    }
  });
});

describe('migration 5.1 — expenses RLS', () => {
  const sql = () => loadMigration('expenses_and_notifications');

  it('lets the notified set read the expense ledger', () => {
    const s = sql();
    expect(s).toMatch(/create policy expenses_select_reader/);
    expect(s).toMatch(/public\.is_expense_reader\(\)/);
  });

  it('lets only recorders insert and edit pending expenses', () => {
    const s = sql();
    expect(s).toMatch(/create policy expenses_insert_recorder/);
    expect(s).toMatch(/create policy expenses_update_recorder/);
    expect(s).toMatch(/public\.is_expense_recorder\(\)/);
  });

  it('lets only approvers flip status (story 5.9)', () => {
    const s = sql();
    expect(s).toMatch(/create policy expenses_update_approver/);
    expect(s).toMatch(/public\.is_expense_approver\(\)/);
  });
});

describe('migration 5.1 — expense_notifications', () => {
  const sql = () => loadMigration('expenses_and_notifications');

  it('creates public.expense_notifications referencing expenses + auth.users', () => {
    const s = sql();
    expect(s).toMatch(/create table if not exists\s+public\.expense_notifications/);
    expect(s).toMatch(/expense_id\s+uuid not null references public\.expenses\(id\) on delete cascade/);
    expect(s).toMatch(/notified_user_id\s+uuid not null references auth\.users/);
  });

  it('enables RLS and scopes select/update to the recipient', () => {
    const s = sql();
    expect(s).toMatch(/alter table\s+public\.expense_notifications\s+enable row level security/);
    expect(s).toMatch(/create policy expense_notifications_select_own/);
    expect(s).toMatch(/create policy expense_notifications_update_own/);
    expect(s).toMatch(/notified_user_id\s*=\s*auth\.uid\(\)/);
  });
});

describe('migration 5.1 — audit + actor stamping', () => {
  const sql = () => loadMigration('expenses_and_notifications');

  it('attaches the audit trigger to expenses (PRD §5)', () => {
    expect(sql()).toMatch(/attach_audit_trigger\('public\.expenses'\)/);
  });

  it('stamps created_by / updated_by via a before trigger (PRD §6.3)', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function\s+public\.set_expense_actor\(\)/);
    expect(s).toMatch(/new\.created_by\s*:=\s*auth\.uid\(\)/);
    expect(s).toMatch(/new\.updated_by\s*:=\s*auth\.uid\(\)/);
    expect(s).toMatch(/before insert or update on public\.expenses/);
  });

  it('seeds standard expense-type categories', () => {
    const s = sql();
    expect(s).toMatch(/insert into public\.categories/);
    expect(s).toMatch(/'expense'/);
  });
});
