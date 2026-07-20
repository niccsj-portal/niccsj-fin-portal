import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 8 story 8.1 — file-level guards for the signatures Storage migration.
 * Migrations run in Postgres, not Node, so we assert the committed SQL enforces
 * the private bucket + strict RLS + the column-safe self-update policy.
 */
const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
const sql = readFileSync(
  path.join(migrationsDir, '20260703170000__signatures_storage.sql'),
  'utf8',
);

describe('signatures storage migration (story 8.1)', () => {
  it('creates a PRIVATE signatures bucket', () => {
    expect(sql).toMatch(/insert into storage\.buckets[\s\S]*'signatures'[\s\S]*false/i);
  });

  it('scopes object RLS to the owning user or admin', () => {
    expect(sql).toMatch(/on storage\.objects/i);
    expect(sql).toMatch(/\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
    expect(sql).toMatch(/public\.app_role\(\) = 'admin'/);
  });

  it('restricts writes to Financial Secretary + Admin', () => {
    expect(sql).toMatch(/signatures_insert_owner_or_admin/);
    expect(sql).toMatch(/'fin_secretary'::public\.app_role,\s*'admin'::public\.app_role/);
  });

  it('lets an FS self-update only the signature path (other columns frozen)', () => {
    expect(sql).toMatch(/users_update_own_signature/);
    expect(sql).toMatch(/role\s*=\s*\(select u\.role\s+from public\.users u where u\.id = auth\.uid\(\)\)/);
    expect(sql).toMatch(/is_active\s*=\s*\(select u\.is_active/);
  });
});
