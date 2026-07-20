# Runbook — Database Backup & Restore

**Audience:** System Admin (volunteer)
**Applies to:** NICC-SJ Finance & Membership Portal (Supabase Postgres)
**Related:** PRD §4.11, technology.md §20, backlog Sprint 9 story 9.9, `/admin/health`

Records must be retained for **at least 10 years** (PRD §9, Q8). Backups are a
manual monthly task until automated backups are provisioned.

---

## 1. When to back up

- **Monthly**, on the first working session of the month (see `monthly-checks.md`).
- **Before** any migration is applied to production.
- **Before** a bulk CSV member import.

## 2. Take a backup (Supabase-managed)

1. Sign in to the Supabase dashboard → select the **prod** project.
2. **Database → Backups**. Confirm the latest daily backup is present and green.
3. For an on-demand logical dump, use the connection string from
   **Project Settings → Database** and run locally:

   ```powershell
   # Requires PostgreSQL client tools (pg_dump) on PATH.
   $stamp = Get-Date -Format 'yyyyMMdd'
   pg_dump "$env:SUPABASE_DB_URL" --format=custom --no-owner `
     --file "niccsj-backup-$stamp.dump"
   ```

4. Store the `.dump` file in the project's secure backup location (not in Git).
5. Record the date: update the deploy workflow's `VITE_LAST_BACKUP` value (or the
   deployment env) so `/admin/health` shows the correct "Last backup" date.

## 3. Restore drill (do at least once per year)

1. Create a scratch Supabase project (or a local Postgres) — **never** restore
   over production during a drill.
2. Restore:

   ```powershell
   pg_restore --clean --no-owner --dbname "$env:SCRATCH_DB_URL" `
     "niccsj-backup-YYYYMMDD.dump"
   ```

3. Verify row counts for `members`, `households`, `contributions`, `expenses`,
   `sub_account_transactions` match expectations.
4. Tear down the scratch project.

## 4. Verify

- [ ] Latest managed backup is green in the dashboard.
- [ ] An on-demand `.dump` exists for this month.
- [ ] `/admin/health` "Last backup" reflects today.
- [ ] Restore drill completed within the last 12 months.

## 5. Security notes

- The DB connection string is a **secret** — never commit it, never paste it into
  chat. Store it in a password manager.
- If the dev/prod DB password is ever exposed, rotate it in
  **Supabase → Settings → Database** and update `SUPABASE_DB_PASSWORD`.
