# Runbook — Go-Live / Production Cutover

**Audience:** System Admin / maintainer (owner)
**Applies to:** NICC-SJ Finance & Membership Portal — Sprint 10 (v1 launch)
**Related:** backlog §4.11, PM.md §5J, `deploy.md`, `backup.md`, `add-user.md`,
`monthly-checks.md`, technology.md §8.3, PRD §4.1/§4.2/§4.6/§10

This runbook takes the tested app from the dev project to a **live production**
deployment for the community. Work through the phases in order. Several steps
cross project **approval gates** (PM.md §3.3) — they are owner-executed on a
**personal network** (the corporate network blocks the Postgres port).

> **Golden rules:** back up before every destructive/bulk step; never commit or
> paste secrets; the anon key is the only Supabase key that belongs in the SPA or
> repo secrets; RLS is the real access boundary.

---

## Phase 0 — Pre-flight (before touching prod)

- [ ] Sprint 9 commit pushed; CI green on `main` (lint, typecheck, tests, build).
- [ ] `npm run test` passes locally; `npm run build` succeeds.
- [ ] Dev DB password rotated if it was ever exposed (Supabase → Settings →
      Database), and `SUPABASE_DB_PASSWORD` updated locally.
- [ ] The list of real role-holders + their emails is ready (Chaplain, Treasurer,
      FS, Group FS ×2, Finance Council, Admin).
- [ ] The cleaned member/household roster is ready in the import template format
      (`docs/templates/members-import-template.csv`).

---

## Phase 1 — Provision the prod project (story 10.1) — **gates 1, 2**

1. Create a **new** Supabase project for production (separate from dev).
2. Note the prod **Project URL** and **anon (publishable) key**
   (Project Settings → API).
3. Link the CLI to prod (personal network):
   ```powershell
   supabase link --project-ref <prod-project-ref>
   ```

## Phase 2 — Schema + functions + storage (story 10.1) — **gate 4**

1. **Apply all migrations in order.** Either:
   ```powershell
   supabase db push --linked
   ```
   or paste each file from `supabase/migrations/` into the SQL Editor
   **oldest → newest** (the 17-file ordered list is in PM.md §5J.4). The
   SQL Editor path works on any network (no DB port needed).
2. Confirm applied set:
   ```powershell
   supabase migration list --linked
   ```
3. **Deploy the Edge Functions:**
   ```powershell
   supabase functions deploy submit-expense
   supabase functions deploy approve-expense
   supabase functions deploy reject-expense
   supabase functions deploy submit-sub-account-report
   supabase functions deploy generate-annual-summary
   ```
4. **Confirm the private Storage buckets exist with RLS.** Both are created by
   migrations (no manual step) — just verify in the dashboard:
   - `receipts` (expense receipts) — from `20260708170000__receipts_storage.sql`.
   - `signatures` (FS signature) — from `20260703170000__signatures_storage.sql`.

## Phase 3 — Wire the frontend to prod (story 10.1) — **gate 4**

1. GitHub → **Settings → Secrets and variables → Actions → Secrets:**
   - `VITE_SUPABASE_URL` = prod URL
   - `VITE_SUPABASE_ANON_KEY` = prod anon key
   - **Never** add the service-role key or DB password here.
2. (Optional) **Variables:** `LAST_BACKUP` (ISO date) for `/admin/health`.
3. Trigger a deploy (merge to `main`, or Actions → Deploy → Run workflow).
4. Verify `/admin/health` shows the new commit SHA and **Online** Supabase status.

## Phase 4 — Seed the first admin + role-holders (story 10.3) — **gate 8**

1. Create the **Admin** account first (Authentication → Add user), then follow
   `add-user.md` to assign the `admin` role and complete **mandatory 2FA**.
2. Onboard the remaining role-holders; assign each Group FS to CMO/CWO
   (`/admin/sub-accounts`); upload the FS signature (`/security` signature page).
3. Verify each role lands on the correct dashboard and sees only permitted nav.

## Phase 5 — Import real data (story 10.2) — **gate 7**

1. **Take a backup first** (`backup.md` §1 — pre-import).
2. **Create the households first**, so members can be attached as they are
   imported. Admin → **Households**: for each row in
   `docs/templates/households-reference-template.csv`, enter the **Family
   number** (the legacy S/N the community already quotes when donating) and the
   household name. The form suggests the next free number; numbers are unique
   and **never reused**, so a family that leaves keeps its number permanently.
3. Admin → **Members → Import**; upload the filled
   `members-import-template.csv`; review the validation preview; import only when
   the preview is clean. `member_number` is the internal **per-person** roster
   id — keep it flat and sequential, and do not encode the family number into
   it. Group each family's rows together in the CSV for readability.
4. Attach each member to their household and designate primary members.
5. Spot-check that the Contributions form's household picker shows
   `<family number> — <name>` so the FS can record a donation straight from the
   number a donor quotes.
4. **Verify the member-number range continues:** the next auto number must be
   `max(member_number) + 1` (records new members after the imported set).
5. Spot-check a few families for correct household grouping and contact details.

## Phase 6 — Backup + restore drill (story 10.5)

- [ ] Take the first prod backup (`backup.md` §2); store the `.dump` securely.
- [ ] Run the restore drill into a **scratch** project (`backup.md` §3) — never
      over prod. Verify row counts.
- [ ] Update `LAST_BACKUP` so `/admin/health` reflects today.

## Phase 7 — Launch-readiness check (story 10.6) — **gate 9**

- [ ] With one **consenting** family, generate + download the signed End-of-Year
      Annual Summary PDF. Verify logo header, category totals, grand total,
      signature block, and disclaimer render correctly.

## Phase 8 — Training (story 10.4)

- [ ] Session 1 — FS / Treasurer / Group FS: record contributions, submit
      expenses, sub-account ledgers, monthly summaries.
- [ ] Session 2 — Council / Chaplain: aggregate dashboards, approval queue.
- [ ] Session 3 — member-facing rollout: sign-in, profile, family contributions,
      language selector, annual summary download.
- [ ] Hand the runbooks (`backup`, `add-user`, `deploy`, `monthly-checks`,
      `go-live`) to the volunteer admin.

## Phase 9 — Cutover + announce (story 10.7) — **gate 4**

1. Run the `deploy.md` §5 post-deploy verification against prod:
   - [ ] Site loads at the Pages URL; deep-link hard-refresh works (404 → SPA).
   - [ ] `/admin/health` shows the deployed commit + Online status.
   - [ ] Smoke-test one role's primary page.
2. (Optional / deferred) custom domain `portal.niccsj.org` — §9.2 Q10.
3. Publish the portal link to the community.
4. Schedule the first `monthly-checks.md` session.

---

## Rollback

- **Frontend:** revert the offending commit on `main`; the deploy re-runs
  (`deploy.md` §6).
- **Migration:** apply a corrective **forward** migration; never edit history.
  Restore from backup only as a last resort (`backup.md` §3).
- **Bad import:** members are soft-deleted (deactivate), never hard-deleted; if a
  bulk import is wrong, deactivate the affected rows and re-import from a
  corrected CSV, or restore the pre-import backup.

---

**Go-live sign-off:** _Admin name / date_ ______________________
