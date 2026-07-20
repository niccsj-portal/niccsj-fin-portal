# Runbook — Deploy

**Audience:** System Admin / maintainer
**Applies to:** NICC-SJ Finance & Membership Portal
**Related:** technology.md §8.2, `.github/workflows/{ci,deploy}.yml`, `/admin/health`

The SPA deploys to **GitHub Pages** automatically on every merge to `main`.
Database migrations and Edge Functions are applied **manually** (see §3–§4).

---

## 1. Frontend deploy (automatic)

1. Open a PR → CI (`ci.yml`) runs lint, typecheck, unit tests and build.
2. Merge to `main` → `deploy.yml` builds and publishes to GitHub Pages.
3. The build injects `VITE_COMMIT_SHA` and `VITE_BUILD_TIME` so
   **Admin Console → System health** (`/admin/health`) shows the deployed
   commit and build time. Confirm they update after a deploy.

Manual trigger: **Actions → Deploy → Run workflow** (workflow_dispatch).

## 2. Required repo configuration

- **Secrets** (Settings → Secrets and variables → Actions → Secrets):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon key only — never the
  service role key).
- **Variables** (optional): `LAST_BACKUP` (ISO date) → shown on `/admin/health`.

## 3. Apply a database migration (manual)

Migrations live in `supabase/migrations/`. On a **personal network** (the
corporate network blocks the DB port):

```powershell
# One-time: link the CLI to the project.
supabase link --project-ref <project-ref>

# Apply pending migrations to the linked project.
supabase db push
```

Alternatively, paste the migration SQL into **Supabase → SQL Editor** and run it.
**Always take a backup first** (see `backup.md`).

## 4. Deploy an Edge Function (manual)

```powershell
supabase functions deploy <function-name>
```

Current functions: `submit-expense`, `approve-expense`, `reject-expense`,
`submit-sub-account-report`, `generate-annual-summary`.

## 5. Post-deploy verification

- [ ] Site loads at the Pages URL; hard-refresh on a deep link works (404→SPA).
- [ ] `/admin/health` shows the new commit SHA and "Online" Supabase status.
- [ ] Sign in for one role and smoke-test its primary page.
- [ ] If a migration/function was applied, run its acceptance check.

## 6. Rollback

- **Frontend:** revert the offending commit on `main`; the deploy re-runs.
- **Migration:** apply a corrective forward migration (never edit history). Restore
  from backup only as a last resort (`backup.md` §3).
