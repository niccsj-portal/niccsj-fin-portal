import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * File-level guards for the household family-number migration
 * (`*household_family_number*.sql`). Same rationale as the earlier parse
 * tests: a fast TDD signal that the committed SQL contains every required
 * object before the cloud `supabase db push`.
 *
 * References:
 *   * PRD §4.2   the community identifies families by a legacy Family S/N;
 *                numbers are never reused, so the constraint is permanent.
 *   * PRD §4.3   contributions are recorded against a household.
 *   * PRD §4.6   the annual summary is issued per household.
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

describe('migration — households.family_number', () => {
  const sql = () => loadMigration('household_family_number');

  it('adds a nullable family_number integer column', () => {
    expect(sql()).toMatch(
      /alter table\s+public\.households\s+add column if not exists family_number integer/,
    );
  });

  it('enforces uniqueness so a number is never shared by two families', () => {
    expect(sql()).toMatch(/households_family_number_unique/);
    expect(sql()).toMatch(/unique\s*\(\s*family_number\s*\)/);
  });

  it('indexes family_number for the ledger / picker lookups', () => {
    expect(sql()).toMatch(/create index if not exists households_family_number_idx/);
  });

  it('documents the column', () => {
    expect(sql()).toMatch(/comment on column public\.households\.family_number/);
  });
});

describe('migration — next_family_number()', () => {
  const sql = () => loadMigration('household_family_number');

  it('suggests max+1 like the member-number generator', () => {
    const s = sql();
    expect(s).toMatch(/create or replace function public\.next_family_number\(\)/);
    expect(s).toMatch(/select coalesce\(max\(family_number\), 0\) \+ 1 from public\.households/);
  });

  it('is SECURITY DEFINER with a pinned search_path (OWASP A03)', () => {
    const s = sql();
    const fn = s.slice(s.indexOf('function public.next_family_number()'));
    expect(fn).toMatch(/security definer/);
    expect(fn).toMatch(/set search_path = public, pg_temp/);
  });

  it('is executable by authenticated callers only', () => {
    const s = sql();
    expect(s).toMatch(/revoke all on function public\.next_family_number\(\) from public/);
    expect(s).toMatch(/grant execute on function public\.next_family_number\(\) to authenticated/);
  });
});
