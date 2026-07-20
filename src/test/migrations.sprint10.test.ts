import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 10 (v1 launch prep) — file-level guards for the receipts Storage
 * migration. Migrations run in Postgres, not Node, so we assert the committed
 * SQL codifies the private bucket + role-based RLS that was previously a manual
 * dashboard step, so a fresh prod project bootstraps from migrations alone.
 */
const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
const sql = readFileSync(
  path.join(migrationsDir, '20260708170000__receipts_storage.sql'),
  'utf8',
);

describe('receipts storage migration (Sprint 10 prep)', () => {
  it('creates a PRIVATE receipts bucket, idempotently', () => {
    expect(sql).toMatch(/insert into storage\.buckets[\s\S]*'receipts'[\s\S]*false/i);
    expect(sql).toMatch(/on conflict \(id\) do nothing/i);
  });

  it('scopes every policy to the receipts bucket on storage.objects', () => {
    expect(sql).toMatch(/on storage\.objects/i);
    const bucketRefs = sql.match(/bucket_id = 'receipts'/g) ?? [];
    // select + insert + update(using+check) + delete = 5 references.
    expect(bucketRefs.length).toBeGreaterThanOrEqual(5);
  });

  it('lets any expense reader read receipts (signed URLs)', () => {
    expect(sql).toMatch(/receipts_select_expense_reader/);
    expect(sql).toMatch(/for select[\s\S]*public\.is_expense_reader\(\)/i);
  });

  it('restricts uploads/replaces/deletes to expense recorders', () => {
    expect(sql).toMatch(/receipts_insert_expense_recorder/);
    expect(sql).toMatch(/receipts_update_expense_recorder/);
    expect(sql).toMatch(/receipts_delete_expense_recorder/);
    expect(sql).toMatch(/public\.is_expense_recorder\(\)/);
  });

  it('is safe to re-run (drops policies before create)', () => {
    const drops = sql.match(/drop policy if exists/g) ?? [];
    expect(drops.length).toBeGreaterThanOrEqual(4);
  });
});
