// scripts/run-pgtap.mjs
// Dev tooling: run a pgTAP test file against a Postgres connection and print
// its TAP output, exiting non-zero if any assertion fails ("not ok ...").
//
// Usage (PowerShell):
//   $env:PG_CONNECTION = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
//   node scripts/run-pgtap.mjs supabase/tests/rls_policies.test.sql
//
// The test file wraps itself in `begin; ... rollback;`, so nothing persists.
// This is the no-Docker path; the canonical runner is `supabase test db`.
import { readFileSync } from 'node:fs';
import process from 'node:process';
import pg from 'pg';

const file = process.argv[2] ?? 'supabase/tests/rls_policies.test.sql';
const conn = process.env.PG_CONNECTION;
if (!conn) {
  console.error('PG_CONNECTION env var is required.');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');
const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

// Collect every text row returned by the batch — pgTAP emits its TAP stream as
// single-column text result rows (plan line, "ok"/"not ok" lines, summary).
function printResults(results) {
  const lines = [];
  for (const r of results) {
    for (const row of r?.rows ?? []) {
      const value = Object.values(row)[0];
      if (typeof value === 'string') lines.push(value);
    }
  }
  for (const line of lines) console.log(line);
  return lines;
}

try {
  await client.connect();
  console.log(`Connected. Running pgTAP suite ${file} ...\n`);
  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  const lines = printResults(results);

  const failures = lines.filter((l) => /^not ok\b/.test(l));
  if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} pgTAP assertion(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ All pgTAP assertions passed.');
  }
} catch (err) {
  console.error('pgTAP run failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
