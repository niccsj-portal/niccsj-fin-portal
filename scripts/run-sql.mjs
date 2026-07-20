// scripts/run-sql.mjs
// Dev tooling: execute a .sql file against a Postgres connection string.
// Usage (PowerShell):
//   $env:PG_CONNECTION = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
//   node scripts/run-sql.mjs supabase/seed.sql
//
// The whole file is sent as one simple-query batch so dollar-quoted functions
// and begin/commit blocks run exactly as written. Intended for the dev DB only.
import { readFileSync } from 'node:fs';
import process from 'node:process';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-sql.mjs <path-to-sql>');
  process.exit(1);
}
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

try {
  await client.connect();
  console.log(`Connected. Executing ${file} ...`);
  await client.query(sql);
  console.log('SQL executed successfully.');
} catch (err) {
  console.error('SQL execution failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
