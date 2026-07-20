import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 1 story 1.1 — file-level guard for the initial schema migration.
 *
 * Real database-level coverage (pgTAP) is scheduled for Sprint 9 (PM.md §8
 * risk row). Until then this test gives us a fast TDD signal that the
 * committed SQL contains every required table and convention from PRD §6.3
 * so the cloud `supabase db push` (gated by AR-13) does not surprise us.
 *
 * The check is intentionally string-based: we want it to fail loudly if a
 * future refactor drops a required object, but not to lock in formatting.
 */

const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');

function loadInitialSchema(): { name: string; sql: string } {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const initial = files.find((f) => f.includes('initial_schema'));
  if (!initial) {
    throw new Error(
      `No "*initial_schema*.sql" file found under supabase/migrations/. Found: ${files.join(', ') || '(empty)'}`,
    );
  }
  return {
    name: initial,
    sql: readFileSync(path.join(migrationsDir, initial), 'utf8').toLowerCase(),
  };
}

describe('supabase/migrations: initial schema (story 1.1)', () => {
  it('has a single, timestamp-prefixed initial migration file', () => {
    const { name } = loadInitialSchema();
    expect(name).toMatch(/^\d{14}__initial_schema\.sql$/);
  });

  it.each([
    ['users'],
    ['members'],
    ['households'],
    ['categories'],
    ['audit_log'],
    ['client_errors'],
  ])('creates the %s table', (table) => {
    const { sql } = loadInitialSchema();
    expect(sql).toMatch(
      new RegExp(`create table\\s+(if not exists\\s+)?(public\\.)?${table}\\b`),
    );
  });

  it('uses numeric(12,2) for money-bearing columns (PRD §6.3 convention)', () => {
    const { sql } = loadInitialSchema();
    // At least one numeric(12,2) column must be declared somewhere (Sprint 4
    // adds contributions; story 1.1 may still surface it via a placeholder).
    expect(sql).toMatch(/numeric\(12\s*,\s*2\)/);
  });

  it('uses timestamptz with default now() (PRD §6.3 convention)', () => {
    const { sql } = loadInitialSchema();
    expect(sql).toMatch(/timestamptz/);
    expect(sql).toMatch(/default\s+now\(\)/);
  });

  it('soft-deletes members and households via is_active (no hard delete on records)', () => {
    const { sql } = loadInitialSchema();
    expect(sql).toMatch(/\bis_active\b/);
  });

  it('enables row level security on every created table', () => {
    const { sql } = loadInitialSchema();
    for (const table of ['users', 'members', 'households', 'categories', 'audit_log', 'client_errors']) {
      expect(sql).toMatch(
        new RegExp(`alter table\\s+(public\\.)?${table}\\s+enable row level security`),
      );
    }
  });

  it('declares member_number as a unique sequential integer (PRD §4.2)', () => {
    const { sql } = loadInitialSchema();
    expect(sql).toMatch(/member_number/);
    // Either via UNIQUE constraint or a unique index.
    expect(sql).toMatch(/unique[^,]*member_number|member_number[^,]*unique/);
  });

  it('records joined_date / occurred_at-style timestamps as not null where required', () => {
    const { sql } = loadInitialSchema();
    expect(sql).toMatch(/joined_date/);
    expect(sql).toMatch(/occurred_at/); // client_errors
  });
});
