# Supabase workspace

Everything Postgres- or Auth-side ships from this folder so the cloud dev project
(see PM.md AR-2: `niccsj-portal-dev`, ref `yichgxjifldxkkpwxwxo`, region
`us-west-2`) stays in lockstep with the repo.

## Layout

```
supabase/
├── migrations/         # numbered SQL files; one PR == one new migration
├── tests/              # pgTAP RLS policy suite (Sprint 9 story 9.7)
└── seed.sql            # idempotent dev seed; never run against prod
```

## Conventions

- **One migration per PR**, named `<utc_timestamp>__<slug>.sql`
  (e.g. `20260619140000__initial_schema.sql`). Timestamps are UTC.
- All money columns use `numeric(12,2)`; all timestamps use `timestamptz`
  defaulting to `now()`; no hard deletes on financial rows (soft-delete via
  `is_active`). See PRD §6.3.
- Every migration enables `row level security` on the tables it creates and
  adds a `comment on table` describing the table's purpose so the dev DB
  remains self-documenting.

## Applying migrations (dev only)

This is gated by **PM.md AR-13**. Once the owner picks an option the agent
will fill in the exact `npm` script. The three options on the table are:

1. **(Recommended)** Owner runs the [Supabase CLI](https://supabase.com/docs/guides/cli)
   locally:
   ```powershell
   supabase login                                   # one-time
   supabase link --project-ref yichgxjifldxkkpwxwxo # one-time per machine
   supabase db push                                 # applies pending files in supabase/migrations/
   ```
   `db push` is idempotent and refuses to run if the local file hashes don't
   match what is recorded in the dev DB.
2. Owner pastes each migration into Supabase Studio → SQL Editor.
3. Owner shares the dev DB password with the agent for automated `db push`.
   Wider blast radius; not preferred.

Migrations are **never** auto-applied by CI in v1 (PRD §6.5). Production
migrations follow the same flow with a separate `supabase link --project-ref`.

## Testing RLS (pgTAP) — Sprint 9 story 9.7

The RLS policy suite in `tests/rls_policies.test.sql` authenticates as each
PRD §4.1 role and asserts the PRD §7 boundaries at the database layer (RLS is
the authoritative control). It seeds fixtures inside a transaction that is
**rolled back**, so it is safe to run against the dev DB.

- **Canonical (local pgTAP harness, needs Docker):**
  ```powershell
  supabase start
  supabase test db        # runs every supabase/tests/*.test.sql
  ```
- **No Docker (against the hosted dev DB), via the repo runner:**
  ```powershell
  $env:PG_CONNECTION = "postgresql://postgres:<pw>@db.yichgxjifldxkkpwxwxo.supabase.co:5432/postgres"
  npm run test:rls        # prints TAP output; exits non-zero on any "not ok"
  ```

The suite requires the `pgtap` extension (preinstalled on Supabase; the file
creates it if missing) and all migrations already applied. Never run against prod.

## Seeding dev users

Gated by **PM.md AR-14**. Once approved, the agent will land `supabase/seed.sql`
containing one synthetic user per role from PRD §4.1 (Member, Financial
Secretary, Treasurer, Group FS [CMO], Group FS [CWO], Chaplain, Finance
Council, System Admin) using placeholder emails such as `dev+fs@niccsj.test`
and a rotate-on-first-login password. The seed is idempotent and is run by
the owner via `supabase db reset` (which re-applies all migrations and then
the seed) against the dev project only.
