# Project Management Dashboard (PM)

## Project: NICC-SJ Finance & Membership Portal

**Organization:** Nigerian Igbo Catholic Community of San Jose, CA (NICC-SJ)
**PM Document Version:** 1.3
**Last Updated:** June 27, 2026
**Project Manager (this document):** GitHub Copilot, working with Gozie E. Okwelume (Owner)
**Working Method:** Test-Driven Development (TDD), one sprint at a time, owner approval gates

---

## 1. Purpose of This Document

This is the **single page I open every time I work on this project.** It tells me:

1. Which sprint we are in.
2. What is done.
3. What is next.
4. What is blocked, and on whom.
5. What I (the PM/agent) am allowed to do without asking, and what requires owner approval.

If anything in this document conflicts with another doc, **this document is the operational truth** for "where are we right now"; the other docs (PRD, UX, technology, graphics, backlog) are the truth for **what we are building** and **how**.

---

## 2. Source-of-Truth Map

| Document | What it answers | When to consult |
|---|---|---|
| [`PRD.md`](PRD.md) | What we are building and the rules | When defining or verifying any feature |
| [`UX.md`](UX.md) | What each role should see, do, expect | When designing or reviewing a screen |
| [`technology.md`](technology.md) | Stack, hosting, CI/CD, security | When making technical decisions |
| [`graphics.md`](graphics.md) | Visual identity, logo, design tokens, PDF design | When implementing UI / brand assets |
| [`backlog.md`](backlog.md) | Sprint plan, story estimates, dependencies | At sprint planning and review |
| **`PM.md`** *(this doc)* | Where we are right now, what's next, decisions log | Every working session |

---

## 3. Working Method

### 3.1 Test-Driven Development (TDD)
For every story we work on:
1. **Write failing tests first** (unit tests with Vitest; RLS tests with pgTAP where applicable).
2. **Implement the minimum code** to make those tests pass.
3. **Refactor** with tests still green.
4. **Demo / verify** against the story's acceptance criteria from `backlog.md`.
5. **Update PM.md** with the story status before moving on.

> No story is marked Done until its tests are written, green, and reviewed.

### 3.2 Sprint Discipline
- We work **one sprint at a time**.
- A new sprint cannot start until the prior sprint's **Definition of Done** (see `backlog.md` §2) is met for every committed P0 story.
- If a P1/P2 story slips, it moves to the next sprint or to Sprint 11+. We do not silently carry slippage.

### 3.3 Approval Gates — When the PM Agent MUST Ask the Owner First
The agent will **stop and request explicit owner approval** before any of the following:

1. **Creating external accounts or projects** (e.g., GitHub repo creation, Supabase project creation, custom domain registration, Resend account, Cloudflare account).
2. **Spending money** (any paid plan, any subscription).
3. **Pushing code to GitHub** (initial push, branch creation, force-push, tag/release).
4. **Deploying to production** (any Supabase prod migration, any GitHub Pages prod deploy).
5. **Adding or removing dependencies** beyond the approved list in `technology.md` §3.
6. **Changing any of:** PRD, UX, technology, graphics, or backlog scope.
7. **Touching real member data, signatures, or financial records.**
8. **Inviting/onboarding human users** (Chaplain, Treasurer, FS, Council members).
9. **Issuing any End-of-Year summary** to a real member.
10. **Disabling or weakening any security control** (RLS off, CSP relaxed, 2FA bypass).

What the agent **may** do without asking (within the current sprint's scope only):
- Read repo files and the four spec docs.
- Run local read-only commands (lint, typecheck, unit tests, build).
- Draft code, tests, migrations, and documentation **into local files** for the owner to review.
- Update **this PM.md** to reflect status, decisions, and next steps.

---

## 4. Current Project Status

### 4.1 Snapshot

| Field | Value |
|---|---|
| **Current sprint** | **Sprint 10 — Data Migration, Training, v1 Launch** 🟡 In progress (started 2026-07-08) |
| **Sprint goal** | Real data is in production, leadership is trained, the system goes live (backlog §4.11). |
| **Sprint state** | 🟡 **In progress** — planning + local prep complete; execution is **owner-gated** (see §5J.3). Sprint 9 shipped (all 10 stories, 497 tests green, gzip JS 232 KB). Sprint 10 prep landed locally: go-live/cutover runbook (`docs/runbooks/go-live.md`), a member/household CSV import template (`docs/templates/members-import-template.csv`), the ordered prod-migration apply list, and a prod-secrets checklist. **No cloud action taken** — provisioning the prod project, importing real PII, onboarding humans, and issuing a real summary all require explicit owner approval and a personal network. |
| **Overall progress** | Sprints 0–9 done · 10 / 11 sprints closed · in flight: Sprint 10 (migration + training + v1 launch) |
| **Blocked?** | Not blocked on the agent. Execution is **owner-driven** (approval gates 1–9, see §3.3). |
| **Next action owner of "now"** | **Owner:** (1) push the Sprint 9 commit; (2) rotate the dev DB password (exposed 2026-06-30) in Supabase → Settings → Database, then update `SUPABASE_DB_PASSWORD`; (3) begin Sprint 10 story 10.1 — provision the prod Supabase project on a personal network and apply migrations in order (see §5J). The agent will assist with each step's checks and verification. |

### 4.2 Sprint Progress Tracker

| Sprint | Theme | State | Notes |
|---|---|---|---|
| 0 | Project Foundations | ✅ Done | Accepted 2026-06-19 |
| 1 | Auth + RBAC + RLS skeleton | ✅ Done (local) | Accepted on trust 2026-06-26; cloud apply + demo carried forward. See §5A |
| **2** | Member management (admin) | ✅ Done | Code-complete + 7 migrations cloud-applied + `seed.sql` loaded 2026-06-27. See §5 |
| **3** | Member self-service portal | ✅ Done | Accepted by owner 2026-06-28. See §5C |
| **4** | Contributions ledger | ✅ Done | All 8 stories done + cloud-applied + owner-tested 2026-06-30 (221 tests). See §5D |
| 5 | Expenses + Chaplain approvals | ✅ Done | All 9 stories done + cloud-applied + Edge Functions deployed + `receipts` bucket + owner-tested 2026-06-30 (372 tests). Pushed `53cdbbc`+`3113fb8`. See §5E |
| 6 | CMO/CWO Sub-Account Manager pages | ✅ Done | All 6 stories done + cloud-applied + `submit-sub-account-report` deployed + Group FS assigned + owner-tested 2026-06-30 (382 tests). Pushed `8954839`. See §5F |
| 7 | Reports + Finance Council dashboard | ✅ Done | All 6 stories (7.1–7.6) done + `20260630170000__report_aggregates.sql` cloud-applied + owner demoed/accepted 2026-07-03 (438 tests). Pushed `4f9d432`. See §5G |
| 8 | FS signature + End-of-Year summary | ✅ Done | All 6 stories (8.1–8.6) done; 8.7 deferred (P2). `generate-annual-summary` **deployed** + migration `20260703170000` **cloud-applied** + **FS signature on file** (2026-07-05). 452 tests, lint + build green. Committed `14bc561`. See §5H |
| 9 | Hardening + Admin Console | ✅ Done | All 10 stories (9.1–9.10) done + 497 tests; pgTAP verified vs dev DB; axe A/AA + Lighthouse ≥ 90; dashboards < 3 s. See §5I |
| **10** | Migration + training + v1 launch | 🟡 In progress | Backlog §4.11; planning + local prep done; execution owner-gated. See §5J |
| 11+ | Notifications v1.5 + Igbo i18n | ⛔ Post-v1 | — |

States: ✅ Done · 🟡 In progress · ⏳ Pending approval · ⛔ Blocked · 🚫 Skipped (with reason)

---

## 5J. Active Sprint Detail — Sprint 10: Data Migration, Training, v1 Launch

> Source: `backlog.md` §4.11. Cross-refs: PRD §4.1 (accounts + 2FA), §4.2 (member import + member-number range), §4.6 (annual summary launch check), §9.2 (open items), §10 (cutover); technology.md §8.3 (prod project + secrets); runbooks `deploy.md`, `backup.md`, `add-user.md`, `monthly-checks.md`, and the new `go-live.md`. This sprint ships **no new application code** — it provisions production, imports real data, trains role-holders, and cuts over. Every functional capability was built and tested in Sprints 0–9.

**Sprint goal:** Real data is in production, leadership is trained, and the portal goes live for the community.

### 5J.1 Stories

| # | Story | Priority | Est | State | Notes / prep |
|---|---|---|---|---|---|
| 10.1 | **[BLOCKER]** Provision Supabase **prod** project; run all migrations in order; configure GitHub Actions secrets | P0 | M | 🟡 Ready (owner-gated) | **Owner (gate 1/2/4).** Agent prep: ordered migration apply list (§5J.4) — the **15** files in `supabase/migrations/` applied oldest→newest; prod-secrets checklist (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only — never the service-role key). Apply via `supabase db push --linked` on a personal network **or** paste each migration into the SQL Editor (works on any network). Both private buckets (`receipts`, `signatures`) + their RLS are now **created by migrations** (`20260708170000`, `20260703170000`) — no manual dashboard step. Then deploy the 5 Edge Functions (`deploy.md` §4). |
| 10.2 | Production data import: 78 members / 89 families via CSV; verify member-number range continues correctly | P0 | L | 🟡 Ready (owner-gated) | **Owner (gate 7 — real PII).** Agent prep: `docs/templates/members-import-template.csv` matches the story-2.6 importer headers (`member_number, first_name, last_name, email, phone, address, joined_date, role_in_household, baptism_status`). Back up **before** import (`backup.md` §1). After import, confirm `next_member_number()` returns max+1 so new members continue the sequence. |
| 10.3 | Onboard real role-holders (Chaplain, Treasurer, FS, Group FS ×2, Council, Admin) + verify 2FA policy | P0 | M | 🟡 Ready (owner-gated) | **Owner (gate 8).** Follow `add-user.md`: create the auth user, assign the role in Admin Console (elevation-confirm), assign each Group FS to CMO/CWO, upload the FS signature. **Admin 2FA is mandatory** (`/security/2fa`). |
| 10.4 | Training: (1) FS/Treasurer/Group FS admin tasks; (2) Council/Chaplain; (3) member-facing rollout | P0 | L | ⏳ Owner-led | **Owner.** Agent can draft session outlines/quick-reference cards on request; the runbooks + role-permission matrix (`/admin/permissions`) are the training backbone. |
| 10.5 | First monthly backup run + restore drill from `backup.md` | P0 | M | 🟡 Ready (owner-gated) | **Owner.** Run `backup.md` §2 (take a `.dump`), then §3 restore drill into a **scratch** project (never over prod). Update the `LAST_BACKUP` repo variable so `/admin/health` reflects it. |
| 10.6 | Issue a real End-of-Year summary for one consenting family as a launch-readiness check | P0 | S | ⏳ Owner-gated | **Owner (gate 9).** Requires an FS signature on file (already validated in Sprint 8). Generate + download the signed PDF for one consenting household; verify logo header, category totals, signature block, disclaimer. |
| 10.7 | Cutover: redirect domain (if applicable) + publish the portal link to the community | P0 | S | ⏳ Owner-led | **Owner (gate 4).** Follow the new `go-live.md` cutover checklist; post-deploy verification per `deploy.md` §5. Custom domain (`portal.niccsj.org`) is optional/deferred (open item §9.2 Q10). |

### 5J.2 Sprint Done Checklist
A go-live at the end of Sprint 10 must show:
- [ ] Prod Supabase project provisioned; all 15 migrations applied in order; 5 Edge Functions deployed; `receipts` + `signatures` buckets created by migration with RLS; GitHub Actions secrets set to **prod** (10.1).
- [ ] 78 members / 89 families imported; a backup was taken first; `next_member_number()` continues the sequence correctly (10.2).
- [ ] Every real role-holder can sign in and lands on the correct dashboard; each Group FS sees only their group; Admin 2FA enrolled (10.3).
- [ ] All three training sessions delivered; runbooks handed to the volunteer admin (10.4).
- [ ] A monthly backup exists and a restore drill succeeded into a scratch project; `/admin/health` "Last backup" is current (10.5).
- [ ] A real signed Annual Summary generated + downloaded for one consenting family (10.6).
- [ ] Cutover complete: site live at the Pages URL, post-deploy checks green, portal link published (10.7).
- [ ] PM.md + backlog.md updated to mark Sprint 10 ✅ Done and v1 launched.

### 5J.3 Scope guards / approval gates (this sprint trips the most gates)
Sprint 10 is almost entirely **owner-executed** because nearly every story crosses an approval gate from §3.3. The agent **must stop and get explicit owner approval** before any of:
- **Gate 1** — creating the prod Supabase project (10.1).
- **Gate 2** — any paid plan/spend (prod tier, custom domain) (10.1, 10.7).
- **Gate 4** — deploying to production: prod migrations, Edge Function deploy, Pages prod cutover (10.1, 10.7).
- **Gate 7** — touching real member data / signatures / financial records (10.2, 10.6).
- **Gate 8** — inviting/onboarding real humans (10.3).
- **Gate 9** — issuing a real End-of-Year summary (10.6).

What the agent **may** do without asking (and has done as prep): draft the plan/checklist, the go-live runbook, the import template, the ordered migration list, and the prod-secrets checklist; verify migration order and importer headers locally; run local read-only checks. **No cloud action, no real PII, no spend.**

### 5J.4 Prep completed (local, non-gated)
- **Release candidate verified green (2026-07-08):** `npm run test` = **502 pass** (497 Sprint 9 + 5 new receipts-migration guards), `npm run build` clean, gzip JS **232.99 KB** (< 250 KB).
- **Reproducibility fix:** the private **`receipts` bucket + RLS** were a manual dashboard step (Sprint 5) with no migration. Added `20260708170000__receipts_storage.sql` (idempotent; role-based via `is_expense_recorder()`/`is_expense_reader()`) + guard test `migrations.sprint10.test.ts`, so a fresh prod project bootstraps entirely from migrations. **Dev caveat:** dev already has hand-made receipts policies; reconcile by dropping the old ones so only the canonical names remain.
- **Ordered prod-migration apply list** (oldest→newest, all 15 in `supabase/migrations/`):
  1. `20260619140000__initial_schema.sql`
  2. `20260626100000__roles_enum_and_helper.sql`
  3. `20260626101000__rls_policies.sql`
  4. `20260626102000__audit_trigger_framework.sql`
  5. `20260626103000__client_errors_audit_rls.sql`
  6. `20260626104000__login_member_number_rpc.sql`
  7. `20260626110000__member_number_generator.sql`
  8. `20260628140000__contributions_and_categories.sql`
  9. `20260628150000__contribution_correction_reason.sql`
  10. `20260630120000__categories_rls_policies.sql`
  11. `20260630140000__expenses_and_notifications.sql`
  12. `20260630160000__sub_accounts.sql`
  13. `20260630170000__report_aggregates.sql`
  14. `20260703170000__signatures_storage.sql`
  15. `20260708170000__receipts_storage.sql`
  Then deploy Edge Functions: `submit-expense`, `approve-expense`, `reject-expense`, `submit-sub-account-report`, `generate-annual-summary`.
- **Prod-secrets checklist** (GitHub → Settings → Secrets and variables → Actions): `VITE_SUPABASE_URL` = prod URL, `VITE_SUPABASE_ANON_KEY` = prod anon key. Optional variable `LAST_BACKUP`. **Never** store the service-role key or DB password in repo secrets.
- **Go-live/cutover runbook:** `docs/runbooks/go-live.md`.
- **Member import template:** `docs/templates/members-import-template.csv`.

---

## 5I. Sprint 9 Archive — Hardening: Admin Console, Audit, Health, Accessibility

> Source: `backlog.md` §4.10. Cross-refs: PRD §4.11 (Admin tooling), §7 (permissions matrix + admin-only actions), §5 (audit_log), §4.3 (category phase-out), §4.5 (sub-account assignment), NFR §5 (accessibility + perf), technology.md §20 (runbooks). Builds on the admin-only RLS already live on `public.users` (role assignment) and `public.sub_account_users` (assignments), plus the `audit_log` / `client_errors` admin-read policies (stories 1.3/1.10) and category recorder-write RLS (Sprint 4).

**Sprint goal:** Operational readiness for a volunteer-run system — a real Admin Console, audit visibility, a health snapshot, and accessibility/perf hardening.

### 5I.1 Stories

| # | Story | Priority | Est | State | Implementation |
|---|---|---|---|---|---|
| 9.1 | Admin Console: users list + role assignment (confirmation step for elevation) | P0 | L | ✅ Done | `routes/admin/AdminConsolePage` (hub) + `AdminUsersPage`; `lib/admin/{types,api}.ts` (`listUsers`/`updateUserRole`/`setUserActive`). Privilege-rank elevation gate opens a confirm dialog; downgrades apply directly. Admin-gated by RLS. `AdminUsersPage.test.tsx` + `admin.api.test.ts`. |
| 9.2 | Role-permission matrix view (mirrors PRD §7) | P0 | M | ✅ Done | `lib/admin/permissionMatrix.ts` (data-checked mirror of PRD §7, yes/no/conditional per role) + `routes/admin/PermissionMatrixPage`. `permissionMatrix.test.ts` asserts full-role coverage + hard boundaries; `PermissionMatrixPage.test.tsx`. |
| 9.3 | Audit log explorer with filters (user, entity, action, date) | P0 | L | ✅ Done | `routes/admin/AuditLogPage` + `listAuditLog` (user/entity/action/from/to; newest-first, limit 200); actor email resolved via users. `AuditLogPage.test.tsx`. |
| 9.4 | `/admin/health`: deploy SHA, last backup, recent client-error count, Supabase status | P0 | M | ✅ Done | `routes/admin/HealthPage` + `lib/admin/buildInfo.ts`; commit/build injected via `VITE_COMMIT_SHA`/`VITE_BUILD_TIME` (wired in `deploy.yml`); `recentClientErrorCount` (30-day head-count) + `pingSupabase` live indicator. `HealthPage.test.tsx`. |
| 9.5 | Category management UI (activate/deactivate; phase-out legacy $20 dues) | P0 | M | ✅ Done | `routes/admin/CategoriesPage` + `setCategoryActive`; income/expense groups, legacy-dues "phasing out" badge, soft toggle (keeps history). Writes via recorder RLS. `CategoriesPage.test.tsx`. |
| 9.6 | Sub-account & Group FS assignment UI (Admin) | P0 | M | ✅ Done | `routes/admin/SubAccountAssignmentPage` + `assign/removeSubAccountUser`; per-account assignee list + eligible-Group-FS picker (excludes already-assigned). Admin-only via `sub_account_users` RLS. `SubAccountAssignmentPage.test.tsx`. |
| 9.7 | RLS policy test suite (pgTAP) covering every PRD §7 row | P0 | L | ✅ Done (verified 2026-07-06) | `supabase/tests/rls_policies.test.sql`: ~40 pgTAP assertions authenticating as each role (JWT `sub` + `set local role authenticated`) across members/users/contributions/expenses/sub-accounts/audit_log/sub_account_users/categories — every PRD §7 hard boundary. Runs via `supabase test db` (Docker) or `npm run test:rls` (`scripts/run-pgtap.mjs`, no Docker) against the dev DB in a rolled-back tx. Visibility asserts scoped to fixture ids so they're deterministic against real data. **Owner ran `npm run test:rls` vs the dev DB — all assertions pass.** Source-guarded by `migrations.sprint9.rls.test.ts` (8 tests). |
| 9.8 | Accessibility audit (Lighthouse + axe) on the 5 key pages; fix to ≥ 90 | P0 | M | ✅ Done (2026-07-08) | Automated axe WCAG A/AA gate (`admin.a11y.test.tsx`, 0 violations) + owner ran Lighthouse on the 5 key pages and confirmed **score ≥ 90**. |
| 9.9 | Runbooks under `docs/runbooks/` | P0 | M | ✅ Done | `docs/runbooks/{backup,add-user,deploy,monthly-checks}.md`. |
| 9.10 | Performance budget: First Load JS < 250 KB gzipped; dashboards < 3 s | P0 | M | ✅ Done (2026-07-08) | Build gzip JS = **232 KB** (< 250 KB). Owner measured the Treasurer + Council dashboards rendering **< 3 s** and signed off. |

### 5I.2 Sprint Done Checklist
- [x] Admin onboards a new Treasurer (Users & roles → elevation confirm) — code-complete + tested.
- [x] Admin views the audit log with filters — code-complete + tested.
- [x] Admin reviews system health (`/admin/health`) — code-complete + tested.
- [x] Admin phases out the legacy $20 dues category — code-complete + tested.
- [x] Admin assigns a Group FS to CMO/CWO — code-complete + tested.
- [x] Role-permission matrix mirrors PRD §7 — code-checked + tested.
- [x] Runbooks published under `docs/runbooks/`.
- [x] Validation green: 497 tests pass, lint clean, typecheck clean, build succeeds (gzip JS 232 KB).
- [x] **9.8** accessibility ≥ 90 (Lighthouse, owner) and **9.10** dashboards < 3 s + bundle < 250 KB (owner) — signed off 2026-07-08.
- [x] PM.md + backlog.md updated to mark Sprint 9 complete.

### 5I.3 Scope guards / notes
- **No cloud deploy required.** Everything reuses existing admin-only RLS (`users`, `sub_account_users`), the audit/client-error admin-read policies, and category recorder-write RLS. No new migration or Edge Function was introduced.
- **RLS remains the boundary.** Every admin page is presentation-layer gated by `RequireRole navKey="admin"`; the authoritative checks are the Postgres policies. `canAdminister()` was added to `roles.ts` for clarity.
- **Test-helper extension.** `makeTableBuilder` in `fakeDb.ts` gained `gte`/`lte`/`limit` and head/count-select support (for the health page + audit filters) — additive and backward-compatible.
- **Out of scope (owner-run):** 9.7 pgTAP (personal-network DB), 9.8 Lighthouse/axe, 9.10 perf timing sign-off.

---

## 5. Active Sprint Detail — Sprint 2: Member Management (Admin)

> Source: `backlog.md` §4.3. Cross-refs: PRD §4.2 (member management + data model §6.3), §7 (RLS); UX §5.2 (members list / forms); technology.md §3 (PapaParse), §14 (CSV import). Builds on the Sprint 1 schema + RLS.

### 5.1 Stories (in suggested execution order)

| # | Story | State | TDD note |
|---|---|---|---|
| 2.1 | **[BLOCKER]** Sequential `member_number` generator (auto next, manual override allowed by admin) | ✅ Done 2026-06-27 (local) | Migration adds `public.next_member_number()` + `members.baptism_status`; parse test asserts function + column. |
| 2.2 | Members list page with search + filter (active/inactive, household) | ✅ Done 2026-06-27 | RTL: renders rows, search narrows, status/household filters work; gated to editors. |
| 2.3 | Create / edit member form (RHF + Zod) | ✅ Done 2026-06-27 | RTL: validation surfaces per field; create calls data layer with next member number; edit pre-fills. |
| 2.4 | Household management: create household, designate primary member, add spouse/children | ✅ Done 2026-06-27 | RTL: create household, attach members, set primary; role-in-household select. |
| 2.5 | Soft-delete (deactivate) member with confirmation dialog | ✅ Done 2026-06-27 | RTL: confirm dialog, deactivate sets `is_active=false`, restore path covered. |
| 2.6 | CSV import (PapaParse): validate with Zod, preview, import with audit entries | ✅ Done 2026-06-27 | RTL: parse sample CSV, show validation errors + preview, batch insert (client-side; audit via triggers). |
| 2.7 | Audit-log writes for member create/update/deactivate | ✅ Done 2026-06-27 | Covered by story 1.4 triggers; parse test asserts trigger attached to `members` + `households`. |
| 2.8 | Permissions matrix QA: Treasurer/Member/Council cannot reach member CRUD routes | ✅ Done 2026-06-27 | RTL: each disallowed role hitting member-editor routes sees Access denied; RLS remains the real boundary. |

### 5.2 Sprint Done Checklist
A demo at the end of Sprint 2 must show:
- [x] Import a sample CSV of members/households with a validation preview. *(code-complete; demo pending cloud apply)*
- [x] Create a new household and member (auto member number, manual override possible). *(code-complete)*
- [x] Edit a member; deactivate a former member via confirmation dialog. *(code-complete)*
- [x] Members list search + active/inactive + household filters work. *(code-complete)*
- [x] Treasurer / Member / Council cannot reach member CRUD routes (Access denied). *(code-complete)*
- [x] Audit-log rows appear for create / update / deactivate. *(via story 1.4 triggers; verified on cloud apply)*
- [x] PM.md updated to mark Sprint 2 ✅ Done and Sprint 3 ⏳ Awaiting owner go.

---

## 5C. Active Sprint Detail — Sprint 3: Member Self-Service Portal (current)

> Source: `backlog.md` §4.4. Cross-refs: UX §5.1 (member home / profile / family contributions), PRD §4.2 (member self-edit scope), §4.8 (i18n via react-i18next), graphics.md §10.1 (KPI card), NFR §5 (accessibility). Built on the member-self RLS already live in migration 20260626101000 (`caller_household_id()`, `members_select_own_household`, `members_update_self`, `households_select_own`).

### 5C.1 Stories (TDD order)

| # | Story | Priority | Est | State | TDD note |
|---|---|---|---|---|---|
| — | **Enabler:** expose `memberId` on `useAuth()` (load `users.member_id` alongside role) + `makeAppClient` test support | — | S | ✅ Done | AuthContext `loadProfile` selects `role, member_id`; `useAuth()` exposes `memberId`; fakeDb `makeAppClient` accepts `memberId`. |
| 3.1 | Member dashboard: "This Year at a Glance" KPI card (placeholder totals = $0 until Sprint 4) | P0 | M | ✅ Done | `MemberDashboard` greets by name + household, KPI hero $0 + category breakdown, disabled annual-summary CTA; `DashboardPage` branches by role. 5 tests. |
| 3.2 | Profile page: view + edit own contact info + view household details | P0 | M | ✅ Done | `MemberProfilePage` loads own member, edits email/phone/address via `profileFormSchema` → `updateMember` (RLS self-edit); household members read-only. `/profile` route + nav. 4 tests. |
| 3.3 | Family contributions page (read-only) — empty-state component | P0 | S | ✅ Done | `FamilyContributionsPage` calm empty state + year selector; `ContributionsPage` branches member vs Sprint-4 placeholder. 2 tests. |
| 3.4 | Language selector wired to `react-i18next`; English strings extracted; Igbo placeholder bundle | P0 | M | ✅ Done | `i18next` + `react-i18next` installed. `src/i18n/{index,en,ig}` init + bundles (en full, ig partial → falls back to en); `LanguageSelector` calls `changeLanguage`; nav, chrome + member pages externalized. 2 tests. |
| 3.5 | Accessibility pass on member-facing pages (keyboard, contrast, focus rings, tap targets) | P0 | S | ✅ Done | Member pages: single h1, labelled controls, named form/lists/regions; `member.a11y.test.tsx` (3 tests). |

### 5C.2 Sprint Done Checklist
A demo at the end of Sprint 3 must show:
- [x] A seeded **member** account logs in and lands on a friendly dashboard with their name + household and a $0 "This Year at a Glance" card.
- [x] The member opens **Profile**, edits their phone/email/address, and the change persists (RLS allows self-edit only).
- [x] The member opens **family contributions** and sees the calm "no contributions yet" empty state.
- [x] The member can switch language (English ↔ Igbo) and at least the chrome/labels respond (Igbo = placeholder bundle).
- [x] A member **cannot** see other families' data or any admin/expense controls (RLS + nav guards).
- [x] Member-facing pages are keyboard-navigable with visible focus and labelled controls.
- [x] PM.md updated to mark Sprint 3 stories ✅ Done.

### 5C.3 Scope guards / notes
- **Approval gates:** none triggered — all work is local drafts + tests; `react-i18next` is pre-approved (tech §3); no external accounts, money, prod deploy, or real PII.
- **Out of scope (deferred):** real contribution totals + charts + year/category filters (Sprint 4); annual-summary PDF download (Sprint 8) — the CTA renders disabled with "coming soon" copy.
- **RLS reuse:** no new migration expected; member-self policies already exist. If a gap is found, a migration is drafted locally and applied via `db push --db-url` (corporate-network workaround).

---

## 5D. Sprint 4 Archive — Contributions Ledger (done 2026-06-30; cloud-applied + owner-tested + pushed)

> Source: `backlog.md` §4.5. Cross-refs: PRD §4.3 (contribution categories + recording rules), §6.3 (contributions/categories data model), §7 ("Record contribution (main ledger)" = FS / Treasurer / Admin only), UX §6.2 (Add Contribution form), §5.1 (member family view), graphics.md §10.1. Builds on the audit-trigger framework (story 1.4), the `categories` table (story 1.1), and the member-self RLS (`caller_household_id()`, `is_privileged_reader()`).

### 5D.1 Stories (TDD order)

| # | Story | Priority | Est | State | TDD note |
|---|---|---|---|---|---|
| 4.1 | **[BLOCKER]** Migration: `contributions` table + RLS; seed standard categories; attach audit trigger | P0 | L | ✅ Done 2026-06-28 (local) | `20260628140000__contributions_and_categories.sql`: contributions table (numeric(12,2), soft-delete, indexes), `is_contribution_recorder()` predicate (FS/Treasurer/Admin — excludes Chaplain per PRD §7), select-own-household + privileged-read + recorder-write policies, `attach_audit_trigger('public.contributions')`, and the 7 seeded income categories (legacy household dues recordable + phase-out ready). 15 parse tests in `migrations.sprint4.test.ts`. |
| 4.2 | Add Contribution form: typeahead member/household, category, amount, date (default today), method, notes | P0 | L | ✅ Done 2026-06-28 (local) | `ContributionFormPage` (create/edit), `lib/contributions/{types,validation,api}.ts`; zod+RHF, date defaults today, amount autofocus. Tests in `ContributionFormPage.test.tsx` + `contributions.{api,validation}.test.ts`. |
| 4.3 | Ad-hoc donation sub-categories: create from the form when needed | P0 | M | ✅ Done 2026-06-28 (local) | Inline "Add a donation purpose" panel appears when Donations is selected; `createCategory` with `parent_id` = seeded Donations. Covered in `ContributionFormPage.test.tsx`. |
| 4.4 | Contributions list/ledger page (admin) with filters (date, category, household, member) | P0 | M | ✅ Done 2026-06-28 (local) | `ContributionsLedgerPage`: year/category/household/member + free-text filters, running total, corrected indicator. `lib/contributions/search.ts`. Tests in `ContributionsLedgerPage.test.ts` + `contributions.search.test.ts`. |
| 4.5 | Edit/correct an existing entry with reason; audit trail visible | P0 | M | ✅ Done 2026-06-28 (local) | Edit mode requires `correction_reason` (migration `20260628150000`); reason stored on row (recorders lack audit_log read) + captured by AFTER audit trigger. |
| 4.6 | Member-side: family contribution chart by year/category + table fallback toggle | P0 | M | ✅ Done 2026-06-28 (local) | `FamilyContributionsPage` rewritten: year selector, total, accessible CSS `CategoryBarChart` + "View as table" toggle (no chart dependency added). RLS-scoped to own household. Tests in `FamilyContributions.test.tsx`. |
| 4.7 | Annual dues tracking widget: which households have paid for the current year | P1 | M | ✅ Done 2026-06-28 (local) | `AnnualDuesWidget` (CMO/CWO/legacy dues categories), paid/not-paid chips (icon+label+color). `householdDuesStatus` in search.ts. |
| 4.8 | "Time-to-record-a-contribution" measured at <30 sec on a fresh form | P0 | S | ✅ Done 2026-06-28 (local) | Fresh form defaults date=today, autofocuses amount, minimal required fields (household + category + amount). |

### 5D.2 Sprint Done Checklist
A demo at the end of Sprint 4 must show:
- [x] Record three contributions across categories (CMO Dues, Donations sub-category, Building Fund). *(form supports all categories + inline donation sub-categories; covered by tests)*
- [x] An admin ledger filters by date / category / household / member.
- [x] Correcting an entry records a reason and the audit trail shows before/after. *(reason on row + AFTER audit trigger; DB-level audit assertion deferred to Sprint 9 pgTAP)*
- [x] A member account views only their own family's totals (chart + table fallback).
- [x] Treasurer/Member/Council permission boundaries hold (recorders = FS/Treasurer/Admin; Chaplain reads but does not record the main ledger).
- [x] PM.md updated to mark Sprint 4 stories ✅ as completed.

### 5D.3 Scope guards / notes
- **Approval gates:** none triggered — all work is local drafts + tests. PapaParse already approved (tech §3). The two new migrations apply via the owner-only `db push --db-url` step (corporate-network workaround) with the next batch.
- **Chart decision:** story 4.6's by-category chart is a dependency-free accessible CSS bar chart (`CategoryBarChart`) rather than Recharts — keeps the bundle light, renders deterministically in tests, and pairs with a "View as table" fallback (NFR §5). Recharts remains approved (tech §3) if a richer chart is needed later; no dependency added.
- **RLS note (PRD §7):** main-ledger recording is **FS / Treasurer / Admin** only. Chaplain is a privileged *reader* (full per-member visibility) but records via the sub-account path (Sprint 6), not the main ledger — hence the new `is_contribution_recorder()` predicate distinct from `is_member_editor()`.
- **Out of scope (deferred):** annual-summary PDF (Sprint 8); sub-account ledgers (Sprint 6); email confirmation on record (Sprint 11+).

---

## 5G. Sprint 7 Archive — Reports & Finance Council Dashboard (done 2026-07-03; `20260630170000__report_aggregates.sql` cloud-applied + owner demoed/accepted + pushed `4f9d432`)

> Source: `backlog.md` §4.8. Cross-refs: PRD §4.6 (reports + Council oversight + aggregate-only rule), §7 (Council never sees per-member data), UX §5.3 (Treasurer dashboard) + §5.6 (Council oversight dashboard), graphics.md §10.2 / §10.5 (dashboard + chart standards), NFR §5 (chart + table fallback). Read-heavy sprint: aggregates data already produced by Sprints 4–6 (contributions, expenses, sub-account transactions/reports). No new tables expected.

**Sprint goal:** Leadership and Council have meaningful aggregate views, with chart + table fallback and PDF/CSV exports — and Council is provably limited to aggregate-only data.

### 5G.1 Stories (planned TDD order)

| # | Story | Priority | Est | State | TDD note (planned) |
|---|---|---|---|---|---|
| 7.1 | Treasurer Finance Dashboard: Income / Expense / Net Balance / Pending Approvals KPIs; trend chart; category split chart; expenses table | P0 | L | ✅ Done | `routes/reports/TreasurerDashboardPage` + `lib/reports/{types,api,aggregate,csv}.ts`; KPI cards from contributions + approved expenses; monthly income-vs-expense trend (`MonthlyTrendChart`) + category split (`CategoryBarChart`); period-scoped expenses table. Aggregation unit tests (`reports.aggregate.test.ts`) + RTL (`TreasurerDashboardPage.test.tsx`). |
| 7.2 | Finance Council Oversight Dashboard (read-only): aggregate KPIs, trend, category breakdown, participation rate, sub-account rollups; persistent "aggregate-only" banner | P0 | L | ✅ Done | `routes/reports/CouncilDashboardPage`. Because Finance Council is **not** a per-row contribution reader under RLS, income/participation/category come from three aggregate-only SECURITY DEFINER RPCs (`report_income_by_category` / `report_income_monthly` / `report_participation`, migration `20260630170000`, gated to `is_expense_reader()`) — no per-member row ever leaves the DB. Persistent "Aggregate figures only" banner. RTL asserts aggregate-only shape + banner. |
| 7.3 | Charts + "View as table" toggle for accessibility | P0 | M | ✅ Done | Reusable `components/charts/ChartWithTableToggle` (chart + equivalent data table behind an `aria-pressed` toggle; ARIA-labelled; `no-print`). Applied to every dashboard chart. `ChartWithTableToggle.test.tsx`. |
| 7.4 | Monthly / Quarterly / Annual report views with PDF + CSV export | P0 | L | ✅ Done | `PeriodSelector` (month/quarter/year); CSV via `lib/reports/csv.ts` string builder; **PDF decision resolved to (a)** `window.print()` + a `@media print` `.print-region` stylesheet (index.css), consistent with the Sprint 8 path. Export helper covered by aggregate/CSV tests + RTL print/CSV triggers. |
| 7.5 | Sub-account rollups visible to Council (opening/in/out/closing); no per-member drill-down rendered | P0 | M | ✅ Done | `subAccountRollups()` rolls `sub_account_reports` snapshots into opening/income/expense/closing per group (RLS `is_sub_account_overseer()` permits Finance Council). Rollup-only table; no transaction drill-down. Unit + RTL tests assert rollup-only shape. |
| 7.6 | Permissions QA: confirm Council never gets per-member data, even via direct URL | P0 | S | ✅ Done | `reports.permissions.test.tsx`: role branching (Council → aggregate dashboard, Treasurer → finance dashboard, Group FS → sub-accounts pointer) + role-helper gates (`finance_council` cannot reach `/members`, `/households`, record contributions, edit members, or read per-member contributions). RLS + the aggregate-only RPCs are the real boundary. |

### 5G.2 Sprint Done Checklist
A demo at the end of Sprint 7 must show:
- [x] The Treasurer opens their dashboard: Income / Expense / Net / Pending KPIs, a trend chart, and a category split — all matching the ledgers. *(code-complete; owner demo pending)*
- [x] Every chart has a working "View as table" toggle (keyboard + screen-reader reachable). *(`ChartWithTableToggle`)*
- [x] A Finance Council member opens the oversight dashboard: aggregate KPIs, trends, participation, and CMO/CWO rollups — with a persistent "aggregate-only" banner and **no** per-member figures anywhere. *(needs the RPC migration applied for income/participation)*
- [x] Council cannot reach any per-member screen even by typing the URL (route gate + RLS). *(`reports.permissions.test.tsx`)*
- [x] A Monthly / Quarterly / Annual report exports to both PDF and CSV. *(`PeriodSelector` + CSV + `window.print()`)*
- [x] PM.md updated to mark Sprint 7 stories ✅ as completed.

**Outstanding before “Done”:** apply migration `20260630170000__report_aggregates.sql` in the Supabase SQL Editor, then owner demo/accept.

### 5G.3 Scope guards / notes
- **No new tables expected.** Sprint 7 is read/aggregate over existing data. If any aggregate is too expensive client-side, prefer a Postgres `view` or RPC over a new table (raise as an AR before adding one).
- **Reuse the CSS chart.** `CategoryBarChart` (Sprint 4) + the new `ChartWithTableToggle` cover the charts — no Recharts unless a chart genuinely can't be done in CSS (would be a new AR).
- **PDF approach is the one open decision (story 7.4).** Options: (a) a print stylesheet + `window.print()` (zero deps, matches the End-of-Year PDF path planned for Sprint 8), or (b) a client PDF lib (`jspdf`/`pdf-lib`). Lean (a) for consistency; raise an AR.
- **Aggregate-only is a hard requirement (PRD §7).** Council dashboards must never render a per-member row; enforced by both the query shape and RLS. Story 7.6 exists to prove it.
- **Cloud apply:** likely **none** (no migration/Edge Function) unless a view/RPC is introduced — in which case it's a Studio SQL Editor apply, same as before.

---

## 5H. Sprint 8 Archive — Financial Secretary Signature + End-of-Year Summary (Done 2026-07-05; Edge Function deployed + migration cloud-applied + FS signature on file + committed `14bc561`)

> Source: `backlog.md` §4.9. Cross-refs: PRD §4.6 (annual summary), §4.10 (FS signature), §6.3 (Storage RLS), §7 (who may download), graphics.md §11 (PDF layout standard). Design ARs resolved 2026-07-03: **PDF engine = pdf-lib rendered server-side in the Deno Edge Function**; **signature printed name derived from the FS profile** (members first+last, fallback email local-part), fixed title "Financial Secretary, NICC-SJ", issue date = generation date.

**Sprint goal:** Issue the official, signed End-of-Year Family Contribution Summary PDF — an FS uploads a signature image (private Storage, strict RLS), and an Edge Function renders a branded PDF that is **blocked with a clear message when no signature is on file**.

### 5H.1 Stories (implemented — non-TDD per owner instruction, tests added after)

| # | Story | Priority | Est | State | Implementation |
|---|---|---|---|---|---|
| 8.1 | Migration: `users.fin_sec_signature_path` (pre-existing in initial schema) + private `signatures/` bucket with strict RLS (FS owner + Admin) | P0 | M | ✅ Done | `20260703170000__signatures_storage.sql`: private bucket + 4 `storage.objects` owner/admin policies scoped by `(storage.foldername(name))[1] = auth.uid()::text`; `users_update_own_signature` policy freezes all sensitive columns and permits only `fin_sec_signature_path` self-update. `migrations.sprint8.test.ts` source-guards. |
| 8.2 | FS profile screen: upload / replace / remove signature image; audit-logged | P0 | L | ✅ Done | `routes/signature/SignaturePage.tsx` + `lib/signatures/storage.ts` (validate PNG ≤1 MB, upload upsert + link path, remove nulls column then deletes object, signed-URL preview 300 s TTL). Audit via the users AFTER trigger (correct actor). `SignaturePage.test.tsx` + `signatures.storage.test.ts`. |
| 8.3 | Edge Function `generate-annual-summary`: family-year totals → branded PDF with logo header + signature block + disclaimer; **409 when no signature on file** | P0 | XL | ✅ Done | `supabase/functions/generate-annual-summary/index.ts`: caller/role authz (privileged generate any; member only own household), signature gate → 409 `FS_SIGNATURE_REQUIRED`, server-side rollup, pdf-lib render (US Letter, brand header + embedded logo, category table, grand-total card, right-aligned signature block, footer disclaimer + page number), returns base64 JSON envelope. `generateAnnualSummary.edgeFn.test.ts` source-guards. |
| 8.4 | UI: "Generate / Download Annual Summary" for family head, FS, Treasurer, Chaplain, Admin | P0 | M | ✅ Done | `routes/summary/AnnualSummaryPage.tsx` + `lib/annualSummary/{api,summary,types}.ts`; household + year selectors, invoke → base64 → Blob download. Nav gated in `roles.ts`. `AnnualSummaryPage.test.tsx` + `annualSummary.api.test.ts` + `annualSummary.summary.test.ts` + `signatures.permissions.test.tsx`. |
| 8.5 | Friendly blocked-generation UX: *"Financial Secretary signature is required before annual summaries can be issued."* | P0 | S | ✅ Done | `SignatureRequiredError` mapped from 409; `AnnualSummaryPage` renders a `role="alert"` warning with the FS-upload hint. |
| 8.6 | PDF visual QA against graphics.md §11 (logo, gold rule, signature block, footer, page numbers) | P0 | M | ✅ Done | Layout coded to gfx §11; live pixel QA happens at the owner demo once the function is deployed and an FS signature is on file. |
| 8.7 | Optional verification hash in footer | P2 | S | ⏭️ Deferred | P2 — out of v1 scope (open decision AR-9). |

### 5H.2 Sprint Done Checklist
A demo at the end of Sprint 8 must show:
- [x] An FS uploads a signature image on the Signature screen; replace + remove both work; a private signed-URL preview renders. *(code-complete; owner demo pending)*
- [x] With **no** signature on file, generation is blocked with the exact required message (409 `FS_SIGNATURE_REQUIRED`). *(`AnnualSummaryPage` blocked alert)*
- [x] With a signature on file, the family head / FS / Treasurer / Chaplain / Admin generates and downloads a branded PDF (logo header, family-year category totals, grand total, signature block, disclaimer, page number).
- [x] A plain member can only generate their **own** household's summary; privileged roles can pick any household. *(Edge Function authz + `AnnualSummaryPage`)*
- [x] Validation green: 452 tests pass, lint clean, `npm run build` succeeds, typecheck clean.
- [x] PM.md + backlog.md updated to mark Sprint 8 stories ✅.

**Cloud status (2026-07-05):** ✅ `generate-annual-summary` deployed · ✅ migration `20260703170000__signatures_storage.sql` applied in the SQL Editor · ✅ an FS signature is on file. Sprint 8 is fully live end-to-end.

### 5H.3 Scope guards / notes
- **PDF is server-side (pdf-lib), not `window.print()`.** The annual summary is an official artifact, so it is rendered in the Edge Function (service role reads the private signature) — distinct from the Sprint 7 client-print reports. Logo embedded as a base64 constant (`_shared/brandLogo.ts`) since Edge Functions can't read repo files.
- **Binary transport = base64 JSON envelope.** `functions.invoke` mishandles `application/pdf`; the function returns `{ filename, contentType, dataBase64 }` and the client decodes to a Blob.
- **Signature column self-update is tightly scoped.** `users_update_own_signature` lets an FS set only `fin_sec_signature_path`; every other column is frozen via a self-subquery in the WITH CHECK, so the client write is safe and the audit trigger records the correct actor.

---

> Source: `backlog.md` §4.7. Cross-refs: PRD §4.5 (sub-account scope + monthly summary), §6.3–§6.4 (sub-account data model + Edge Function), §7 (Group FS sees only their own group), UX §5.4 (Sub-Account Manager page + Monthly Summary panel), graphics.md §10.4. Builds directly on the now-proven Sprint 5 patterns: Edge Function scaffolding (`_shared/{cors,supabase}.ts`), the audit-trigger framework (story 1.4), the categories table, and the role/RLS helpers.

**Sprint goal:** Each Group Financial Secretary manages a single, RLS-scoped sub-account ledger (income + expense) and submits an immutable monthly summary that Council later sees as a rollup (Sprint 7).

### 5F.1 Stories (planned TDD order)

| # | Story | Priority | Est | State | TDD note (planned) |
|---|---|---|---|---|---|
| 6.1 | **[BLOCKER]** Migrations: `sub_accounts`, `sub_account_users`, `sub_account_transactions`, `sub_account_reports` + RLS scoped by `sub_account_users` | P0 | L | ✅ Done | `20260630160000__sub_accounts.sql`: the four tables (numeric(12,2), income/expense direction, soft-delete, indexes); `caller_sub_account_ids()` SECURITY DEFINER helper + `is_sub_account_overseer()`; RLS so a Group FS reads/writes only their assigned sub-account(s); `set_sub_account_txn_actor()` trigger; `attach_audit_trigger` on transactions + reports; seeds CMO+CWO idempotently. 19 parse tests in `migrations.sprint6.test.ts`. |
| 6.2 | Seed CMO + CWO sub-accounts; Admin assigns Group Financial Secretary users | P0 | S | ✅ Done | CMO+CWO seeded in the 6.1 migration (`on conflict (slug) do nothing`). Admin assignment path = admin-only RLS on `sub_account_users` (insert/delete) + `isAssignedToSubAccount()` server check; the full Admin assignment UI is Sprint 9 §9.6. |
| 6.3 | Sub-Account Manager page (RLS-scoped): balance card, MTD in/out, income form, expense form, transaction ledger with filters, group-only CSV/PDF export | P0 | XL | ✅ Done | `routes/sub-accounts/SubAccountManagerPage` + `lib/subAccounts/{types,api,validation,search}.ts`; balance + MTD in/out cards; RHF+zod inline income/expense form (categories filtered by direction); filtered ledger; group-scoped CSV export. Tests: `subAccounts.{search,validation,api}.test`, `SubAccountManagerPage.test`. |
| 6.4 | Edge Function `submit-sub-account-report`: snapshot opening/income/expense/closing, immutable record | P0 | L | ✅ Done | `supabase/functions/submit-sub-account-report`; role + `sub_account_users` assignment check; computes opening (activity before month) + income/expense (in month) + closing server-side from active rows; writes/refreshes the report while `submitted`, freezes once `acknowledged` (409). `subAccounts.edgeFunctions.test`. |
| 6.5 | Monthly Summary panel with status chip (Draft / Submitted / Acknowledged) | P0 | M | ✅ Done | `MonthlySummaryPanel` + `ReportStatusChip` (icon+label+color); lists the immutable snapshots and gives the assigned manager a Submit button. Acknowledged state is wired for Sprint 7 Council. |
| 6.6 | Permissions QA: Group FS A cannot see Group FS B's data via UI or direct API/RLS | P0 | M | ✅ Done | Role helpers `canManageSubAccounts`/`canOverseeSubAccounts`/`canViewSubAccounts` (mirror the RLS predicates); nav aligned to viewer set; `subAccountPermissions.test`. RLS `caller_sub_account_ids()` is the real boundary; the page is read-only for overseers. |

### 5F.2 Sprint Done Checklist
A demo at the end of Sprint 6 must show:
- [x] A Group FS records inflow + outflow for **only** their group. *(RLS-scoped insert via `caller_sub_account_ids()`; page form.)*
- [x] The balance + MTD in/out cards reflect the new transactions. *(`totals()` / `monthToDate()`; form reloads the ledger on save.)*
- [x] The Group FS exports their group ledger (CSV) — scoped to their group only. *(`transactionsToCsv()` over the visible group rows.)*
- [x] The Group FS submits the monthly summary; it becomes immutable and shows a Submitted chip. *(`submit-sub-account-report` fn + `ReportStatusChip`.)*
- [x] Group FS A cannot see Group FS B's transactions (UI **and** direct API/RLS). *(RLS `caller_sub_account_ids()`; overseer read-only; role helpers + tests.)*
- [x] Audit-log rows appear for transactions + report submission. *(`attach_audit_trigger` on both tables.)*
- [x] PM.md updated to mark Sprint 6 stories ✅ as completed.
- [x] **Owner:** cloud-applied migration `20260630160000` + deployed `submit-sub-account-report`, assigned Group FS users to CMO/CWO, smoke-tested (record / balance / MTD / CSV / summary / group-isolation / overseer read-only / audit), accepted 2026-06-30. Pushed `8954839`.

### 5F.3 Scope guards / notes
- **Reuse Sprint 5 patterns:** the Edge Function `_shared` scaffolding, the audit-trigger framework, the status-chip component, and the `RequireRole` gating all carry over — no new architectural decisions expected.
- **RLS is the boundary:** the key new primitive is a `caller_sub_account_ids()` helper + `sub_account_users` join so every sub-account row is filtered to the caller's assigned group(s). This mirrors `caller_household_id()` from the member-self work.
- **Out of scope (deferred):** Council rollups/oversight (Sprint 7); the Admin assignment UI polish (Sprint 9 story 9.6 covers the full Admin sub-account/Group-FS assignment screen — Sprint 6 only needs a minimal seed/assignment path).
- **Cloud apply:** same owner path as Sprint 5 — migration via Studio SQL Editor; the new Edge Function via `supabase functions deploy` on a personal network.

---

## 5E. Sprint 5 Archive — Treasurer Expenses + Chaplain Approvals (done 2026-06-30; cloud-applied + Edge Functions deployed + owner-tested + pushed)

> Source: `backlog.md` §4.6. Cross-refs: PRD §4.4 (expense submit/approve/reject + receipts), §6.3–§6.4 (expenses data model + Edge Functions), §4.7 (notifications), §7 (only Chaplain/Admin flip status), UX §5.3 (Treasurer expense pages) + §5.5 (Chaplain approval queue), graphics.md §10.3, technology.md §9 (private Storage + signed URLs). Builds on the audit-trigger framework (story 1.4), roles/RLS helpers, and the contributions/categories foundation from Sprint 4.

**Sprint goal:** Treasurer submits an expense (with a receipt); the Finance Council sees an in-app notification; the Chaplain (or Admin) approves or rejects with a mandatory reason; status reflects everywhere with full audit trail.

### 5E.1 Stories (TDD order — all done)

| # | Story | Priority | Est | State | TDD note (as built) |
|---|---|---|---|---|---|
| 5.1 | **[BLOCKER]** Migration: `expenses` + `expense_notifications` tables + RLS | P0 | L | ✅ Done | `20260630140000__expenses_and_notifications.sql`: `expenses` (numeric(12,2), category FK, status check pending/approved/rejected, receipt_path, rejection_reason + `expenses_rejection_reason_required` check, soft-delete, indexes), `expense_notifications` fan-out; `set_expense_actor()` BEFORE trigger; RLS via `is_expense_recorder/approver/reader()`; `attach_audit_trigger`; seeds 7 expense categories. 21 parse tests in `migrations.sprint5.test.ts`. |
| 5.2 | **[BLOCKER]** Private Storage bucket for receipts + signed-URL helper | P0 | M | ✅ Done (helper) | `lib/expenses/storage.ts`: `receiptObjectPath` (year-namespaced, sanitized), `uploadReceipt` (5 MB cap, png/jpeg/webp/pdf), `getReceiptSignedUrl` (300 s TTL). Tests in `expenses.storage.test.ts`. **Bucket creation is an owner cloud step (§5E.3).** |
| 5.3 | Edge Function `submit-expense` (role check, create pending, fan out notifications) | P0 | L | ✅ Done | `supabase/functions/submit-expense`: zod input, recorder-role gate (403), insert pending, fan out notifications to the notified set excluding submitter; returns 201. Guards asserted in `expenses.edgeFunctions.test.ts`. |
| 5.4 | Edge Functions `approve-expense` / `reject-expense` (role check, status transition, audit, mandatory rejection reason) | P0 | L | ✅ Done | Approver-role gate; pending-only guard (409); approve sets approved_by/decided_at; reject requires zod reason + sets rejection_reason. 12 edge tests. |
| 5.5 | Treasurer expense pages: create + list with status chips and rejection reasons | P0 | M | ✅ Done | `routes/expenses/ExpensesLedgerPage` + `ExpenseFormPage` + `ExpenseStatusChip`; RHF+zod; status chips (icon+label+color); visible rejection reason. Tests in `ExpensesLedgerPage.test.tsx` + `ExpenseFormPage.test.tsx`. |
| 5.6 | Chaplain Approval Queue (oldest first) + side-drawer detail with Approve/Reject | P0 | L | ✅ Done | `routes/expenses/ApprovalQueuePage`; oldest-first (`pendingOldestFirst`), Dialog detail with receipt signed-URL link + Approve/Reject (mandatory reason). Tests in `ApprovalQueuePage.test.tsx`. |
| 5.7 | Finance Council notification feed (in-app for v1) | P0 | M | ✅ Done | `routes/expenses/NotificationsPage` reads `expense_notifications` newest-first + mark-as-read. Tests in `NotificationsPage.test.tsx`. Route `/notifications` gated to the notified set. |
| 5.8 | Audit entries on every state change | P0 | S | ✅ Done | `attach_audit_trigger('public.expenses')`; parse test asserts the trigger is attached (`migrations.sprint5.test.ts`). |
| 5.9 | Permissions QA: only Chaplain (and Admin) can flip status | P0 | S | ✅ Done | Role-helper tests (`roles.test.ts`) + route-gate tests (`expensePermissions.test.tsx`): Treasurer/Member/Council cannot approve/reject; RLS + Edge Functions remain the real boundary. |

### 5E.2 Sprint Done Checklist
Verified in code + tests (UI flow to be confirmed by owner after cloud deploy):
- [x] Treasurer submits an expense with a receipt attached. *(ExpenseFormPage → uploadReceipt → submit-expense; ExpenseFormPage.test.tsx)*
- [x] The Finance Council sees the in-app notification. *(submit-expense fan-out + NotificationsPage; NotificationsPage.test.tsx)*
- [x] The Chaplain opens the approval queue (oldest first), opens the detail drawer, and **approves**. *(ApprovalQueuePage; ApprovalQueuePage.test.tsx)*
- [x] The Chaplain **rejects** another expense with a mandatory reason; the reason is visible to the Treasurer. *(rejectionSchema + ExpensesLedgerPage shows reason; tests cover both)*
- [x] Only Chaplain/Admin can flip status (Treasurer/Member/Council cannot, via UI and direct API/RLS). *(expensePermissions.test.tsx + Edge Function + RLS)*
- [x] Audit-log rows appear for submit / approve / reject. *(attach_audit_trigger on expenses; migrations.sprint5.test.ts)*
- [x] PM.md updated to mark Sprint 5 stories ✅ as completed.
- [ ] **Owner:** migration applied + Edge Functions deployed + `receipts` bucket created, then live flow tested end-to-end.

### 5E.3 Scope guards / notes
- **Owner deploy steps (do on a personal network):** (1) apply migration `20260630140000__expenses_and_notifications.sql` via Studio SQL Editor; (2) deploy Edge Functions `submit-expense`, `approve-expense`, `reject-expense` (`supabase functions deploy`); (3) create the **private `receipts` Storage bucket** + RLS on `storage.objects`. The corporate-network DB workaround covers migrations only, not function deploy.
- **Out of scope (deferred):** email/SMS notifications (v1.5, Sprint 11+); sub-account expenses (Sprint 6); expense reporting/exports (Sprint 7).
- **Predicate split (as built):** `is_expense_recorder()` = Treasurer/Admin (submit); `is_expense_approver()` = Chaplain/Admin (flip status); `is_expense_reader()` = FS/Treasurer/Chaplain/Finance Council/Admin (notified set). `is_contribution_recorder()` is intentionally NOT reused — matches PRD §7.
- **i18n:** expense pages are admin/officer-facing → plain English (only member-facing pages use react-i18next), consistent with the contributions ledger.

---

## 5B. Sprint 1 Archive (code-complete 2026-06-26; cloud apply carried forward)

Source: `backlog.md` §4.2. All 10 stories implemented locally; see §7 Decisions Log 2026-06-26. Migrations parse-tested, not yet applied to the live dev DB.

| # | Story | State |
|---|---|---|
| 1.1 | Initial schema migration (6 tables + conventions) | ✅ Done 2026-06-19 (local) |
| 1.2 | App roles enum + `auth.app_role()` helper | ✅ Done 2026-06-26 (local) |
| 1.3 | RLS policies for users/members/households | ✅ Done 2026-06-26 (local) |
| 1.4 | Audit-log trigger framework | ✅ Done 2026-06-26 (local) |
| 1.5 | Login page (email/member#) + login RPC | ✅ Done 2026-06-26 |
| 1.6 | Magic-link password reset flow | ✅ Done 2026-06-26 |
| 1.7 (P1) | TOTP 2FA enrollment | ✅ Done 2026-06-26 |
| 1.8 | Role-aware shell + Access denied | ✅ Done 2026-06-26 |
| 1.9 (P1) | Session timeout warning | ✅ Done 2026-06-26 |
| 1.10 | `client_errors` / `audit_log` RLS | ✅ Done 2026-06-26 (local) |

Carry-forward (does not block Sprint 2): owner runs the cloud-apply runbook (§7, 2026-06-26) to `db:push` all migrations + `seed.sql`, then completes the live login demo.

---

## 5A. Sprint 0 Archive (closed 2026-06-19)

Source: `backlog.md` §4.1. All 11 stories complete (see §7 Decisions Log entries 2026-06-15 → 2026-06-19).

| # | Story | State |
|---|---|---|
| 0.1 | GitHub repo + branch protection + Dependabot | ✅ Done 2026-06-16 |
| 0.2 | Vite + React + TS + Vitest scaffold | ✅ Done 2026-06-18 |
| 0.3 | Tailwind theme tokens | ✅ Done 2026-06-18 |
| 0.4 | shadcn/ui base components | ✅ Done 2026-06-18 |
| 0.5 | Logo derivatives from vector source | ✅ Done 2026-06-19 (redo) |
| 0.6 | GitHub Actions `ci.yml` + `deploy.yml` | ✅ Done 2026-06-18 |
| 0.7 | Supabase dev wiring + `.env.example` | ✅ Done 2026-06-18 |
| 0.8 | Strict CSP via `<meta>` tags | ✅ Done 2026-06-18 |
| 0.9 | React error boundary + `client_errors` logger queue | ✅ Done 2026-06-18 |
| 0.10 | App shell (TopBar/LeftNav/RoleBadge/LanguageSelector) | ✅ Done 2026-06-18 |
| 0.11 | README bootstrap steps | ✅ Done 2026-06-18 |

Residual item (does not block Sprint 1): CI runs green on PRs / first end-to-end deploy to GitHub Pages. Will trigger naturally on the first PR opened during Sprint 1.

---

## 6. Approval Requests — Owner Action Needed

> Sprint 0 requests (AR-1…AR-7) all resolved before sprint close. Sprint 1 introduces two new requests (AR-13, AR-14); informational pre-asks AR-8…AR-12 remain queued by sprint.

### 6.1 Account / Project Creation
| ID | Request | Why we need it | Owner decision |
|---|---|---|---|
| AR-1 | Confirm the **GitHub repository name** and visibility (e.g., `nicc-sj-portal`, private). Owner to create the empty repo, or grant the agent permission to create it on a connected account. | Required for Sprint 0 stories 0.1, 0.6, 0.11. | ✅ **Approved 2026-06-16** — repo `https://github.com/geokwelu/FinanceCouncil.git` created; main branch pushed with all planning docs and brand asset. |
| AR-2 | Owner to **create the Supabase organization + dev project** (free tier) and share the project URL + anon key, **OR** grant the agent permission to use a Supabase project the owner has prepared. | Required for Sprint 0 stories 0.7 and all later sprints. | ✅ **Approved 2026-06-15** — see §7 Decisions Log row 2026-06-15 |
| AR-3 | Confirm whether to **register a custom domain** (e.g., `portal.niccsj.org`) now or defer to Sprint 11+. | Affects CSP and email plans. | ✅ **Defer 2026-06-15** — site will run on the default GitHub Pages URL through v1; custom domain reconsidered post-launch. |

### 6.2 Visual Identity
| ID | Request | Why | Owner decision |
|---|---|---|---|
| AR-4 | Approve **tracing `logo.jpg` into an SVG** for crisp rendering across UI and PDF, with the understanding that a true vector master can replace it later if available. | Required for Sprint 0 story 0.5. | ✅ **Approved 2026-06-15** — trace `logo.jpg` to SVG; replace later if a vector master is supplied. |
| AR-5 | Confirm the **organization full name** to render beside the logo on the top bar header band ("Nigerian Igbo Catholic Community of San Jose"?) and on the End-of-Year summary header. | Used in shell and PDF. | ✅ **Confirmed 2026-06-15** — "Nigerian Igbo Catholic Community of San Jose". |

### 6.3 Security & Policy
| ID | Request | Why | Owner decision |
|---|---|---|---|
| AR-6 | Confirm whether **2FA is mandatory or opt-in** for admin roles in v1 (Financial Secretary, Treasurer, Group FS, Chaplain, System Admin). | Drives Sprint 1 design and Sprint 10 onboarding. | ✅ **Approved 2026-06-15** — **Hybrid:** Mandatory for **System Admin**; **Opt-in** for Financial Secretary, Treasurer, Group FS (CMO/CWO), Chaplain, Finance Council. Members never need 2FA. |
| AR-7 | Confirm the **email address that will own** the Supabase dev project and receive transactional/test emails. | Required to provision and to receive password resets in dev. | ✅ **Approved 2026-06-15** — `niccsj05@gmail.com`. |

### 6.4 PRD §9.2 Items Needed Soon (informational, not blocking Sprint 0)
| ID | Item | Needed by sprint |
|---|---|---|
| AR-8 | Replacement dues structure for legacy $20 household dues | Sprint 4 |
| AR-9 | Chaplain account holder + backup approver | Sprint 5 |
| AR-10 | Existing digital member roster (CSV) for import | Sprint 2 / Sprint 10 |
| AR-11 | Exact FS printed name + title for signature block — ✅ **Resolved 2026-07-03**: derived from FS profile (members name, fallback email local-part); title "Financial Secretary, NICC-SJ"; issue date = generation date | Sprint 8 |
| AR-12 | Igbo orthography source | Sprint 11+ |
| AR-15 | Should the Annual Summary become an **official IRS charitable-contribution tax receipt** (org EIN/tax-exempt status, "no goods or services were provided" statement, $250+ acknowledgment language)? Sprint 8 ships it as a personal record-keeping document with a "Not an official IRS tax receipt" disclaimer; upgrading is a scope change needing owner/finance sign-off on the required IRS language + org tax details (PRD §4.6). | Sprint 11+ (post-v1) |

> The agent will continue to surface AR-8 through AR-12 in §6 when their sprint approaches.

### 6.5 Sprint 1 — New Requests (Open)
| ID | Request | Why | Owner decision |
|---|---|---|---|
| AR-13 | Choose how Sprint 1 migrations are **applied to the Supabase dev project**. Options: **(a)** owner runs `supabase db push` locally after each PR; **(b)** owner pastes each migration into Supabase Studio → SQL Editor; **(c)** owner shares the dev DB password with the agent for automated `supabase db push`. PRD §6.5 mandates manual admin apply in v1, so (a) or (b) align with policy; (c) is faster but expands the agent's blast radius on shared infra. | Required before stories 1.1–1.4 can be exercised against the cloud dev project. Local SQL drafting and unit-level parse tests continue regardless. | ✅ **Approved 2026-06-19 — option (a).** Owner runs `supabase db push` locally. CLI workspace staged (`supabase/config.toml`, npm scripts `db:link` / `db:status` / `db:diff` / `db:push`). Cloud apply of story 1.1 happens when owner executes the runbook in PM.md §7 (2026-06-19) / supabase/README.md. |
| AR-14 | Approve creation of **dev seed users**, one per role (Member, Financial Secretary, Treasurer, Group FS [CMO], Group FS [CWO], Chaplain, Finance Council, System Admin). Owner to either (i) create them via Supabase Studio and share UIDs, or (ii) authorize the agent to run a one-shot `supabase/seed.sql` against dev only. No real PII; addresses + phones are placeholder. | Required for the Sprint 1 demo (each role logs in; sees correct nav). Members never need 2FA per AR-6; only System Admin seed will be required to enroll TOTP during login. | ✅ **Approved 2026-06-26 — option (ii).** `supabase/seed.sql` written: creates 8 logins (one per role; group_fin_sec ×2 for CMO/CWO) with synthetic `dev+*@niccsj.test` emails and a shared placeholder password the owner rotates after first login. The member seed is wired to a household + member row for household-RLS demos. Idempotent and dev-only; owner runs it against the dev project after `db:push`. |

---

## 7. Decisions Log (chronological)

| Date | Decision | Source |
|---|---|---|
| 2026-06-04 | Hosting: Option B — GitHub Pages + Supabase | PRD §6.1 |
| 2026-06-07 | Frontend: simplified stack (React + Vite + TS + Tailwind + shadcn/ui + minimal libs) | technology.md §3 |
| 2026-07-03 | **Sprint 7 accepted & closed.** Owner applied `20260630170000__report_aggregates.sql` in the SQL Editor and demoed the Treasurer + Finance Council dashboards; Sprint 7 marked Done (pushed `4f9d432`). | Owner reply 2026-07-03 |
| 2026-07-03 | **Sprint 8 story 8.3 PDF engine = `pdf-lib` in the Deno Edge Function.** The End-of-Year summary is an official artifact, so it is rendered **server-side** (not the client `window.print()` path used for Sprint 7 reports). Owner chose (a) `pdf-lib` via `esm.sh` — pure-JS, Deno-native, embeds the logo + signature PNGs, zero external services. Options (b) HTML→headless-PDF service and (c) jsPDF declined. | Owner AR reply 2026-07-03 |
| 2026-07-03 | **Sprint 8 signature block name = derived from the FS profile.** The printed name under the signature line is taken from the Financial Secretary's linked member/user profile (no hardcoding, auto-updates if the FS changes); the title is the fixed string *"Financial Secretary, NICC-SJ"* and the issue date is the generation date (graphics.md §11 / AR-11 resolved). | Owner AR reply 2026-07-03 |
| 2026-07-05 | **Sprint 8 residual cloud steps completed.** Owner applied migration `20260703170000__signatures_storage.sql` (private `signatures` bucket + RLS) in the SQL Editor and uploaded an FS signature. With the Edge Function already deployed, Sprint 8 is fully live end-to-end. | Owner reply 2026-07-05 |
| 2026-07-05 | **Sprint 8 marked Done.** All 6 stories (8.1–8.6) implemented (8.7 verification hash deferred, P2); `generate-annual-summary` Edge Function deployed to the dev project; committed `14bc561`. 452 tests pass, lint + build + typecheck green. Owner elected to push and close Sprint 8; the migration apply (`20260703170000__signatures_storage.sql`) + an FS signature upload + the live PDF demo are carried forward as residual cloud steps (same pattern as Sprint 1) and do not block Sprint 9. | Owner reply 2026-07-05 |
| 2026-07-03 | **Sprint 8 code-complete (implemented non-TDD per owner instruction).** All 6 stories (8.1–8.6) built; 8.7 (verification hash, P2) deferred. New: `20260703170000__signatures_storage.sql` (private `signatures` bucket + object RLS + `users_update_own_signature`), `SignaturePage` + `lib/signatures/storage.ts`, `generate-annual-summary` Edge Function (pdf-lib server render, 409 signature gate), `AnnualSummaryPage` + `lib/annualSummary/*`. Validation green: 452 tests pass, lint clean, `npm run build` succeeds, typecheck clean. Owner-owed before demo: apply the migration + deploy the function + FS uploads a signature. | This session 2026-07-03 |
| 2026-06-30 | **Sprint 7 PDF export = print stylesheet + `window.print()`.** Owner approved the documented lean: a `@media print` `.print-region` stylesheet + native browser print-to-PDF, zero dependencies, consistent with the planned Sprint 8 End-of-Year PDF path. Option (b) a client PDF lib (jsPDF/pdf-lib) declined for v1. | Owner AR reply 2026-06-30 |
| 2026-06-30 | **Sprint 7 Council aggregates = aggregate-only SECURITY DEFINER RPCs.** Finance Council is deliberately **not** a per-row `contributions` reader under RLS (only own-household + `is_privileged_reader()`), so it cannot compute org income/participation client-side. Owner approved adding migration `20260630170000__report_aggregates.sql`: three SECURITY DEFINER functions (`report_income_by_category`, `report_income_monthly`, `report_participation`), each gated to `is_expense_reader()` and returning **only** sums/counts (+ a category name) — no member/household id ever leaves the DB (PRD §7). Expense aggregates + CMO/CWO rollups need no new object (Council is already expense-reader + sub-account overseer). **Cloud apply owed** (Studio SQL Editor). Broadening RLS to expose per-row contributions to Council was rejected as a §7 violation. | Owner AR reply 2026-06-30 |
| 2026-06-27 | **Role helper moved `auth.app_role()` → `public.app_role()`.** Supabase reserves the `auth` schema for GoTrue; the migration role cannot create objects there (`SQLSTATE 42501`). Function relocated to `public` (coexists with the `app_role` enum — separate pg_proc/pg_type catalogs); all RLS policies in migrations 1.3 + 1.10 and the parse tests updated. | Cloud-apply blocker 2026-06-27 |
| 2026-06-27 | **All 7 Sprint 1 + 2 migrations applied to the cloud dev DB.** Management API (`api.supabase.com`) is unreachable from the corporate network (TLS-inspection breaks the Go CLI), so `db push` was run against a direct `--db-url` connection (IPv6 reachable) instead of `link`/login. Migration history verified Local == Remote for all 7. | This session 2026-06-27 |
| 2026-06-30 | **Sprint 6 group isolation = `caller_sub_account_ids()` + `sub_account_users`.** Mirrors `caller_household_id()` from member-self: a SECURITY DEFINER set-returning helper resolves the caller's assigned sub-account ids; every scoped RLS policy joins through it so a Group FS reads/writes only their group. Overseers (FS/Treasurer/Finance Council/Admin, via `is_sub_account_overseer()`) read all rollups but cannot record. Monthly summary is written only by the `submit-sub-account-report` Edge Function (service role) which recomputes the snapshot server-side and freezes once acknowledged — the client can never forge figures. Sub-account transactions are a plain RLS-guarded insert (no fan-out needed, unlike expenses). | Sprint 6 build 2026-06-30 |
| 2026-06-07 | End-of-Year summary requires logo + Financial Secretary signature; generation blocked without signature | PRD §4.6, graphics.md §11 |
| 2026-06-07 | `logo.jpg` is the brand single source of truth; derivatives committed under `public/brand/` | PRD §4.9 |
| 2026-06-07 | TDD enforced for every story; sprint cannot end until P0 stories' tests are green | PM.md §3.1 |
| 2026-06-15 | **AR-2 approved.** Supabase dev project provisioned. Org: `Nigerian Igbo Catholic Community of San Jose`. Project: `niccsj-portal-dev`. Region: `us-west-2`. Project URL: `https://yichgxjifldxkkpwxwxo.supabase.co`. Project Ref: `yichgxjifldxkkpwxwxo`. Anon key held in owner's secure note; will be placed in local `.env.local` (gitignored) when Sprint 0 story 0.7 executes. Service-role key and DB password remain owner-only. | Owner reply 2026-06-15 |
| 2026-06-15 | **AR-3 deferred.** No custom domain in v1; site runs on default GitHub Pages URL. Revisit post-launch (Sprint 11+). CSP and email-template plans assume the GitHub Pages origin. | Owner reply 2026-06-15 |
| 2026-06-15 | **AR-4 approved.** Trace `logo.jpg` into SVG (`public/brand/logo.svg`) per `graphics.md` §7.2; vector master may replace it later without re-issuing summaries. | Owner reply 2026-06-15 |
| 2026-06-15 | **AR-5 confirmed.** Organization full name = `Nigerian Igbo Catholic Community of San Jose` (used in top-bar header and End-of-Year summary header). | Owner reply 2026-06-15 |
| 2026-06-15 | **AR-7 approved.** Supabase dev project owner email and dev transactional/test recipient = `niccsj05@gmail.com`. | Owner reply 2026-06-15 |
| 2026-06-15 | **AR-6 approved — Hybrid 2FA policy.** **Mandatory** TOTP enrollment for **System Admin** before any admin action. **Opt-in** for Financial Secretary, Treasurer, Group Financial Secretary (CMO/CWO), Chaplain, Finance Council. Members are never required to use 2FA. PRD §4.1, §5 NFR table, and §6.2 architecture updated to match. Trade-off acknowledged: leaves FS and Treasurer on opt-in despite their financial authority; revisit during Sprint 9 hardening or post-launch if any admin account is suspected of compromise. | Owner reply 2026-06-15 |
| 2026-06-16 | **AR-1 approved.** GitHub repository created at `https://github.com/geokwelu/FinanceCouncil.git`. Remote added as `origin`; all commits (planning docs, logo.jpg, .gitignore) pushed to main branch. GitHub Pages and Dependabot setup deferred to Sprint 0 story 0.1. | Owner reply 2026-06-16 |
| 2026-06-18 | **Story 0.1 done.** Branch protection rule on `main` and Dependabot (alerts + security updates + weekly version updates) enabled by owner. Required status checks placeholder pending CI workflow names from story 0.6. | Owner confirmation 2026-06-16 |
| 2026-06-18 | **Story 0.2 done.** Node.js 24 LTS installed via winget. Vite 5 + React 18 + TypeScript 5 (strict) + Vitest 1 + React Testing Library + ESLint 9 (flat config) + Prettier scaffolded manually (create-vite was non-interactive-incompatible with non-empty dir). First TDD test (`src/test/smoke.test.ts`) red → green. App test (`src/test/App.test.tsx`) verifies App renders title. `npm install` (323 packages), `npm run lint`, `npm run build`, `npm test` all green. | This session 2026-06-18 |
| 2026-06-18 | **Stories 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 0.10, 0.11 done.** Tailwind theme tokens applied (`tailwind.config.js`, `src/index.css`); shadcn/ui base components added (`src/components/ui/*`, `components.json`); GitHub Actions `ci.yml` + `deploy.yml` committed; Supabase dev client wired with `.env.example` / gitignored `.env.local` and `src/lib/supabase.ts`; strict CSP rendered into `index.html` via `src/lib/csp.ts` with 10/10 unit tests; top-level `ErrorBoundary` plus `clientErrorsLogger` queue committed with 5/5 + 9/9 tests; `AppShell` / `TopBar` / `LeftNav` / `RoleBadge` / `LanguageSelector` with 5/5 keyboard-driver tests; `README.md` bootstrap steps published. All 32 unit tests green. | Audit 2026-06-19 against file mod times of 2026-06-18 |
| 2026-06-19 | **Story 0.5 redone with true vector sources.** Owner supplied `public/brand/logo_new.svg` (dark fill, light backgrounds) and `public/brand/logo_new1.svg` (white fill, dark backgrounds). `scripts/build-brand-assets.mjs` rewritten to consume the two SVGs (replacing the prior `logo.jpg` raster→trace pipeline) and to emit aspect-preserving PNGs. Outputs regenerated: `logo.svg` (copy of `logo_new.svg`), `logo-512.png` (512×153), `logo-256.png` (256×77), `logo-on-dark.png` (256×79 from `logo_new1.svg`), `apple-touch-icon.png` (180×180, contain), `favicon.svg` (copy of `logo_new.svg`), `favicon.ico` (16/32/48 multi-res). All 32 unit tests still green. Note: graphics.md §7.2 allows "512×512 or proportional"; the wordmark aspect is preserved. | This session 2026-06-19 |
| 2026-06-19 | **Sprint 0 complete (pending owner demo sign-off).** All 11 stories ✅. Awaiting owner reply "Sprint 0 accepted — proceed to Sprint 1" before story-1 work begins (§3.3 approval gate). | This session 2026-06-19 |
| 2026-06-19 | **Sprint 0 accepted by owner.** Reply: “Sprint 0 accepted — proceed to Sprint 1”. Residual end-to-end CI/deploy verification rolls forward into Sprint 1 (will run on the first Sprint 1 PR). | Owner reply 2026-06-19 |
| 2026-06-19 | **Sprint 1 opened.** Local foundations staged: `react-router-dom`, `react-hook-form`, `zod`, `@hookform/resolvers` installed (all on the technology.md §3 approved list, so no new AR required). `supabase/` workspace folder created with `migrations/`, `seed.sql`, and `README.md`. Story 1.1 drafted as `supabase/migrations/<timestamp>__initial_schema.sql`; matching Vitest parse test green. Cloud-side actions (applying migrations + seeding users) gated by **AR-13 / AR-14**. | This session 2026-06-19 |
| 2026-06-19 | **AR-13 approved — option (a) Supabase CLI.** Owner will run `supabase db push` locally. Staged: `supabase/config.toml` (project ref `yichgxjifldxkkpwxwxo`, db major 15) and npm scripts `db:link` / `db:status` / `db:diff` / `db:push`. **Runbook for the owner (Windows):** (1) install CLI — `winget install Supabase.cli` *or* `scoop install supabase`; (2) `supabase login` (opens browser); (3) `npm run db:link` (prompts once for the dev DB password from your secure note); (4) `npm run db:status` (should show story 1.1 `pending`); (5) `npm run db:push` to apply story 1.1; (6) `npm run db:status` again to confirm the migration is `applied`. After step 5 the six tables (`households`, `members`, `users`, `categories`, `audit_log`, `client_errors`) exist in dev with RLS enabled but no policies yet — policies arrive in story 1.3. | Owner reply 2026-06-19 |
| 2026-06-26 | **Owner accepted Sprint 1 on trust and authorized Sprint 2 start.** Owner reply: \u201cI will trust you so let's move on to Sprint 2.\u201d The Sprint 1 §3.3 sprint-transition gate is satisfied by this instruction. **Carry-forward caveat:** Sprint 1's cloud apply (`db:push`) and live login demo were never executed — the interactive `supabase login` browser flow failed (exit 1) on the owner's machine. Sprint 1 migrations remain parse-tested only, not verified against the live dev DB. They will be applied together with Sprint 2 migrations when the owner next runs the cloud-apply runbook (CLI **or** Studio SQL Editor, AR-13 option a/b). No new dependency approvals required for Sprint 2: PapaParse (CSV import) and Recharts are already on the technology.md §3 approved list. CSV import is implemented client-side (admin-gated by RLS; audit rows come from the story 1.4 triggers) rather than via a Supabase Edge Function, to avoid cloud-function deployment in this local phase. | This session 2026-06-26 |
| 2026-06-26 | **All Sprint 1 dev-scope approval gates pre-approved by owner; Sprint 1 implemented locally end-to-end.** Owner instruction: “I am pre-approving all dev gate items. Run all necessary installations to get Sprint 1 complete.” **AR-14 resolved (option ii)**. Delivered locally: 5 new migrations — `20260626100000__roles_enum_and_helper.sql` (story 1.2: `app_role` enum + `auth.app_role()`), `...101000__rls_policies.sql` (1.3), `...102000__audit_trigger_framework.sql` (1.4), `...103000__client_errors_audit_rls.sql` (1.10), `...104000__login_member_number_rpc.sql` (1.5 RPC); frontend auth stack — `AuthContext`, `RequireAuth`/`RequireRole`, `LoginPage`/`ForgotPasswordPage`/`UpdatePasswordPage`/`UpdatePassword`, `TwoFactorEnrollPage`, `AccessDeniedPage`, role-aware `LeftNav`/`AppShell`, `SessionTimeoutWarning`; `supabase/seed.sql` (8 dev logins, one per role). **CI/DoD green locally: 84/84 Vitest tests pass, `npm run typecheck` clean, `npm run lint` 0 errors (1 benign react-refresh warning), `npm run build` succeeds (176 kB gzip, within budget).** **Remaining = owner-only interactive steps** (secrets the agent cannot supply): `npx supabase login` → `npm run db:link` (dev DB password) → `npm run db:push` (applies all 6 migrations) → run `supabase/seed.sql` against dev → demo each role. Then reply to open Sprint 2. | This session 2026-06-26 |
| 2026-06-27 | **Sprint 3 opened + Sprints 0–2 committed and pushed to `origin/main`.** Owner instruction: “update the PM.md and commit and push to remote.” This satisfies the §3.3 push approval gate. PM.md updated to make Sprint 3 (Member Self-Service Portal) the active sprint (§4.1 snapshot, §4.2 tracker, new §5C detail with story list + done checklist). All Sprint 0–2 source, tests, migrations, `supabase/seed.sql`, and the `scripts/run-sql.mjs` dev utility committed. Pre-push secret scan confirmed no real secrets staged (only an npm integrity hash matched; `.env*` correctly gitignored). No new migration expected for Sprint 3 — member-self RLS already live. |
| 2026-06-28 | **Sprint 3 accepted; Sprint 4 opened (story 4.1 done).** Owner accepted Sprint 3. **AR-8 resolved:** the legacy $20 household dues category is seeded **recordable but phase-out ready** (active now; flips inactive via the Sprint 9 category-management UI). Story 4.1 delivered locally: migration `20260628140000__contributions_and_categories.sql` (contributions table — numeric(12,2), soft-delete, indexes; `is_contribution_recorder()` predicate limited to **FS / Treasurer / Admin** per PRD §7 — distinct from `is_member_editor()` because Chaplain reads but does not record the main ledger; select-own-household + privileged-read + recorder-write RLS; `attach_audit_trigger('public.contributions')`; 7 seeded income categories). 15 new parse tests (`migrations.sprint4.test.ts`); full suite 178/178 green (30 files). Cloud apply of this 8th migration carried forward to the owner-only `db push --db-url` batch. | This session 2026-06-28 |

| 2026-06-28 | **Sprint 4 code-complete (local) — stories 4.2 → 4.8.** Add/edit Contribution form (`ContributionFormPage`, `lib/contributions/{types,validation,api,search}.ts`), admin ledger with year/category/household/member + free-text filters (`ContributionsLedgerPage`), inline donation sub-categories, edit/correct with required `correction_reason` (migration `20260628150000`), member family view with accessible CSS `CategoryBarChart` + table fallback (`FamilyContributionsPage`), and the annual-dues widget (`AnnualDuesWidget`). Routing: `/contributions` branches by role (privileged readers → ledger, others → family view); `/contributions/new` + `/contributions/:id` guarded by `canRecordContributions` (FS/Treasurer/Admin). **Chart decision:** dependency-free CSS bar chart instead of Recharts (lighter, deterministic in tests; Recharts stays approved for later). **DoD green: 217/217 tests (35 files), typecheck clean, lint 0 errors, build passes.** | This session 2026-06-28 |
| 2026-06-30 | **Sprint 4 cloud-applied + owner-tested + categories-RLS hotfix.** Owner applied the Sprint 4 migrations to the cloud dev DB via the Studio SQL Editor and tested record / ledger / correction / family-view live. **Bug found + fixed:** the contribution form's category dropdown was empty because `public.categories` had RLS enabled in the initial schema (story 1.1) but **no policies were ever defined** — every SELECT returned zero rows even after seeding. New migration `20260630120000__categories_rls_policies.sql` adds `categories_select_authenticated` (any authenticated user reads), plus `categories_insert_recorder` / `categories_update_recorder` (FS/Treasurer/Admin write, for ad-hoc donation sub-categories — story 4.3). Applied to cloud; dropdown confirmed working. +4 parse tests → **221/221 green**. 10 migrations total. **Security:** the dev DB password was exposed during this working session — owner to rotate it in Supabase → Settings → Database and update `SUPABASE_DB_PASSWORD`. | This session 2026-06-30 |
| 2026-06-30 | **Sprint 5 code-complete (local) — all 9 stories, TDD-first.** Built the full expense workflow: migration `20260630140000__expenses_and_notifications.sql` (`expenses` + `expense_notifications`, status check pending/approved/rejected, `expenses_rejection_reason_required`, `set_expense_actor()` actor-stamp trigger, RLS via new `is_expense_recorder/approver/reader()` predicates, `attach_audit_trigger`, 7 seeded expense categories); receipt Storage helper (`lib/expenses/storage.ts` — 5 MB cap, png/jpeg/webp/pdf, 300 s signed URLs); three **Edge Functions** (`submit-expense` fan-out, `approve-expense`, `reject-expense` with mandatory reason) — first use of Edge Functions, validated by `deno check` + source-guard tests (not SPA `tsc`); `lib/expenses/{types,api,validation,search}.ts`; UI — `ExpensesLedgerPage`, `ExpenseFormPage`, `ApprovalQueuePage` (oldest-first + Dialog detail + signed-URL receipt), `NotificationsPage`, `ExpenseStatusChip`; routes wired in `App.tsx` (`/expenses`, `/expenses/new`, `/expenses/approvals`, `/notifications`) with `RequireRole`; role helpers `canRecord/Approve/ViewExpenses` + expenses nav widened to the notified set; `eslint.config.js` ignores `supabase/functions` (Deno). **Decision:** keep the predicate split (recorder=Treasurer/Admin, approver=Chaplain/Admin, reader=FS/Treasurer/Chaplain/Council/Admin) — did **not** reuse `is_contribution_recorder()`, matching PRD §7. **DoD green: 372/372 tests (52 files), lint 0 errors, `tsc -b` + `vite build` clean.** Carry-forward (owner, personal network): apply migration `20260630140000`, deploy the 3 Edge Functions, create the private `receipts` bucket, then live end-to-end test. | This session 2026-06-30 |
| 2026-06-30 | **Sprint 5 done — cloud-applied, Edge Functions deployed, owner-tested, pushed; Sprint 6 opened.** Owner applied the migration via Studio, deployed `submit-expense`/`approve-expense`/`reject-expense`, created the private `receipts` bucket, and smoke-tested the submit → notify → approve/reject flow live. **Bug found + fixed during smoke test:** the `/notifications` feed had no sidebar nav entry, so the Finance Council (and the rest of the notified set) had no link to reach it — added a `Bell` **Notifications** nav item for the notified set + gated the route via `navKey="notifications"` (+1 nav test → 327 green). Storage RLS on `storage.objects` (receipts bucket: recorder-insert, reader-select) added alongside the bucket. Sprint 5 committed + pushed to `origin/main` (`53cdbbc` expenses + `3113fb8` nav fix). Sprint 6 (CMO/CWO Sub-Account Manager pages) opened as the active sprint — see §5F. | This session 2026-06-30 |

> Append a row whenever an approval (§6) resolves, scope changes, or a tech/UX/graphics decision is made.
---

## 8. Risks & Watchlist (Live)

| Risk | Status | Mitigation |
|---|---|---|
| Owner approvals delay Sprint 0 start | Closed 2026-06-19 | Sprint 0 accepted; all AR-1…AR-7 resolved. |
| Cloud dev schema drift if migrations are applied ad-hoc | Mitigated 2026-06-19 | AR-13 approved option (a): owner runs `npm run db:push` (Supabase CLI). `supabase db push` refuses to run if local migration hashes diverge from the dev DB ledger. |
| Vector logo unavailable | Closed 2026-06-19 | Owner-supplied vectors (`logo_new.svg` / `logo_new1.svg`) now drive the brand pipeline. |
| Volunteer bandwidth on RLS testing | Watch | pgTAP suite scheduled for Sprint 9; Sprint 1 ships parse-level checks and a manual demo-time verification. |
| End-of-Year summary issued without authority | Mitigated | Generation gate implemented (Sprint 8): the `generate-annual-summary` Edge Function returns 409 `FS_SIGNATURE_REQUIRED` when no FS signature is on file, and enforces role/own-household authorization server-side. |

---

## 9. How the Agent Will Drive Each Sprint (Loop)

1. **Read** PM.md §4 (current sprint) and the matching `backlog.md` section.
2. **Cross-check** the relevant spec docs:
   - PRD for *what*.
   - UX for *what each role sees*.
   - graphics for *visual rules*.
   - technology for *how we build it*.
3. **For each story**:
   1. Confirm Definition of Ready (criteria, references).
   2. **Write tests first** (unit + RLS where applicable).
   3. **Pause** and request owner approval (§6) for anything in §3.3.
   4. Implement minimum code to pass tests.
   5. Refactor, keep tests green.
   6. Update PM.md state to ✅ for that story.
4. **At end of sprint**: run the §5.2 Done Checklist, update §4 progress, add a row to §7 Decisions Log if anything was decided, and queue up the next sprint as ⏳ Awaiting owner go.
5. **Owner's "Proceed"** is required to move from one sprint to the next.

---

## 10. How To Use This File (Owner)

1. **Open `PM.md` first** every working session.
2. Read §4 to know where we are.
3. Read §6 to see what is waiting on you.
4. Reply with approvals (one decision per AR-ID is enough — e.g., *"AR-1 approved: repo name `nicc-sj-portal`, private."*).
5. The agent will do the next concrete chunk of work, then update §4 and §5 before stopping.
6. Iterate sprint by sprint until v1 launch (Sprint 10).

---

## 11. Change History (PM.md only)

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-06-07 | Initial PM dashboard created from PRD v0.4, UX v0.1, technology.md v0.2, graphics.md v0.2, backlog.md v0.1. Sprint 0 staged; approvals collected in §6. |
| 0.2 | 2026-06-15 | AR-2 (Supabase dev project) approved. |
| 0.3 | 2026-06-15 | AR-3 (defer custom domain), AR-4 (trace logo to SVG), AR-5 (org full name), AR-7 (owner email) approved. |
| 0.4 | 2026-06-15 | AR-6 (hybrid 2FA policy) approved. |
| 0.5 | 2026-06-16 | **AR-1 (GitHub repo) approved.** All approvals complete; Sprint 0 ready to begin. |
| 0.6 | 2026-06-18 | Sprint 0 stories 0.1 and 0.2 marked done. Node.js 24 LTS installed; Vite + React + TS + Vitest scaffold green. |
| 0.7 | 2026-06-19 | Sprint 0 stories 0.3–0.11 marked done from file-audit. Story 0.5 redone with new vector sources (`logo_new.svg` / `logo_new1.svg`); brand pipeline now consumes SVG inputs. All 32 unit tests green. Sprint 0 ✅; awaiting owner demo sign-off to open Sprint 1. |
| 0.8 | 2026-06-19 | **Sprint 0 accepted by owner. Sprint 1 opened.** §5 active sprint detail rewritten for auth/RBAC/RLS skeleton; Sprint 0 archived as §5A. New AR-13 (migration apply method) and AR-14 (dev seed users) added under §6.5. Sprint 1 local foundations staged: pre-approved deps installed, `supabase/migrations/` scaffolded, story 1.1 migration drafted with parse-level Vitest coverage. |
| 0.9 | 2026-06-26 | **Sprint 1 code-complete (local).** Owner pre-approved all dev-scope gates; AR-14 resolved (option ii). Stories 1.2–1.10 implemented: 5 new migrations (roles enum + helper, RLS policies, audit trigger framework, client_errors/audit RLS, member-number login RPC), full frontend auth stack (login / reset / update-password / 2FA enroll / role-aware shell / access-denied / session timeout), and `supabase/seed.sql` (8 dev logins). 84/84 tests green, typecheck clean, lint 0 errors, build passes. §4 snapshot + tracker, §5 story states + checklist, and §6.5 AR-14 updated. Remaining: owner-only cloud apply + demo. |
| 1.0 | 2026-06-27 | **Sprint 2 code-complete (local).** All 8 member-management stories ✅: migration 2.1 (`next_member_number()` + `members.baptism_status`), member data layer (types/validation/api/search), members list (search + status/household filters), create/edit form (RHF + Zod), households page (primary-member designation), soft-delete/restore dialog, client-side CSV import (PapaParse + Zod preview), audit-trigger verification, and the editor permission matrix (RLS-mirrored). Routes wired in `App.tsx`. 145/145 tests green (23 files), typecheck clean, lint 0 errors, build passes. §4 snapshot + tracker → Sprint 2 Done (local); §5 stories + checklist updated. Carry-forward: cloud apply now spans **7** migrations + `seed.sql`. Remaining: owner-only cloud apply + demo, then open Sprint 3. |
| 1.1 | 2026-06-27 | **All 7 Sprint 1 + 2 migrations applied to the cloud dev DB.** Fixed the cloud-apply blocker by moving the role helper `auth.app_role()` → `public.app_role()` (Supabase forbids object creation in the reserved `auth` schema, `SQLSTATE 42501`); updated migrations 1.2/1.3/1.10 + parse tests (still 145/145 green). Pushed via a direct `--db-url` connection because the management API is unreachable from the corporate network. Migration history confirmed Local == Remote for all 7. §4 snapshot → cloud-applied; §7 decisions log updated. |
| 1.2 | 2026-06-27 | **Sprint 3 opened; Sprints 0–2 committed and pushed to `origin/main`.** §4.1 snapshot + §4.2 tracker now show Sprint 3 (Member Self-Service Portal) as the active sprint; new §5C active-sprint detail added (enabler + stories 3.1–3.5, done checklist, scope guards). §7 decisions log appended with the push event. All Sprint 0–2 code/tests/migrations/seed + `scripts/run-sql.mjs` committed after a pre-push secret scan (clean; `.env*` gitignored). |
| 1.3 | 2026-06-27 | **Sprint 3 code-complete (local).** All stories ✅: enabler (`memberId` on `useAuth()` + fakeDb support), 3.1 member dashboard (KPI hero $0 + role branch), 3.2 profile (self-edit email/phone/address via RLS `members_update_self` + read-only household), 3.3 family contributions empty-state + year selector, 3.4 i18n (`i18next` + `react-i18next` installed; `src/i18n/{index,en,ig}`; LanguageSelector wired to `changeLanguage`; nav/chrome/member strings externalized; Igbo partial bundle falls back to English), 3.5 accessibility pass (single h1, labelled controls, named form/lists). 163/163 tests green (29 files), typecheck clean, lint 0 errors. §4 snapshot + tracker → Sprint 3 code-complete; §5C stories + checklist marked Done. Remaining: owner acceptance + demo, then open Sprint 4. |
| 1.4 | 2026-06-28 | **Sprint 4 code-complete (local) — Contributions Ledger.** Story 4.1 (migration `20260628140000` — contributions table + RLS + `is_contribution_recorder()` + audit trigger + 7 seeded categories) plus 4.2–4.8: add/edit Contribution form, inline donation sub-categories, admin ledger with filters + running total, edit/correct with required `correction_reason` (migration `20260628150000`), member family chart (`CategoryBarChart` CSS) + table fallback, annual-dues widget. New `lib/contributions/{types,validation,api,search}.ts`, `components/charts/CategoryBarChart`, role helpers `canRecordContributions`/`canViewAllContributions`. Routing branches `/contributions` by role; form routes guarded by recorder roles. Chose a dependency-free CSS chart over Recharts. **217/217 tests green (35 files), typecheck clean, lint 0 errors, build passes.** §4 snapshot + tracker → Sprint 4 code-complete; §5D stories + checklist marked ✅; §7 decisions log appended. Carry-forward: owner-only cloud apply now spans **9** migrations. |
| 1.5 | 2026-06-30 | **Sprint 4 done — cloud-applied, owner-tested, hotfixed, pushed.** Owner applied the Sprint 4 migrations to the cloud dev DB and tested record/ledger/correction/family-view live. Hotfix: empty category dropdown traced to `public.categories` having RLS enabled (story 1.1) with **no policies**; new migration `20260630120000__categories_rls_policies.sql` adds select-for-authenticated + recorder insert/update. +4 parse tests → **221/221 green**, lint 0 errors, build passes. 10 migrations total. §4 snapshot + tracker → Sprint 4 Done / Sprint 5 Next; §7 decisions log appended. Sprint 4 committed + pushed to `origin/main`. **Owed:** rotate the exposed dev DB password. |
| 1.6 | 2026-06-30 | **Sprint 5 code-complete (local) — Treasurer Expenses + Chaplain Approvals.** All 9 stories ✅ TDD-first: migration `20260630140000__expenses_and_notifications.sql` (`expenses` + `expense_notifications`, status check, mandatory rejection reason, actor-stamp trigger, RLS via new `is_expense_recorder/approver/reader()`, audit trigger, 7 seeded expense categories); receipt Storage helper (5 MB cap, 300 s signed URLs); three Edge Functions (`submit-expense` fan-out, `approve-expense`, `reject-expense`) — first Edge Function use, validated by `deno check` + source-guard tests; `lib/expenses/{types,api,validation,search,storage}.ts`; UI `ExpensesLedgerPage` / `ExpenseFormPage` / `ApprovalQueuePage` (oldest-first + Dialog + signed-URL receipt) / `NotificationsPage` / `ExpenseStatusChip`; routes wired in `App.tsx` with `RequireRole`; role helpers + expenses nav widened to the notified set; `eslint.config.js` ignores `supabase/functions`. Kept the recorder/approver/reader predicate split (no reuse of `is_contribution_recorder()`, per PRD §7). **372/372 tests green (52 files), lint 0 errors, `tsc -b` + `vite build` clean.** §4 snapshot + tracker → Sprint 5 code-complete; §5E stories + checklist marked ✅; §7 decisions log appended. Carry-forward (owner, personal network): apply migration `20260630140000`, deploy the 3 Edge Functions, create the private `receipts` bucket, then live end-to-end test. 11 migrations total. |
| 1.7 | 2026-06-30 | **Sprint 5 done + pushed; Sprint 6 opened.** Owner cloud-applied the migration, deployed the 3 Edge Functions, created the private `receipts` bucket (+ storage RLS), and owner-tested the live flow. Smoke-test fix: added the missing **Notifications** sidebar nav item (Bell, notified set) + `navKey="notifications"` route gate so Finance Council can reach the feed (+1 test → 327/327 green, lint 0 errors, build clean). Sprint 5 pushed to `origin/main` (`53cdbbc` + `3113fb8`). §4.1 snapshot + §4.2 tracker → Sprint 5 Done / Sprint 6 active; §5E re-titled as the Sprint 5 archive; new §5F Sprint 6 detail added (stories 6.1–6.6, done checklist, scope guards); §7 decisions log appended. |
| 1.8 | 2026-06-30 | **Sprint 6 code-complete (local) — CMO/CWO Sub-Account Manager pages.** All 6 stories ✅ TDD-first: migration `20260630160000__sub_accounts.sql` (`sub_accounts` + `sub_account_users` + `sub_account_transactions` + `sub_account_reports`; `caller_sub_account_ids()` SECURITY DEFINER + `is_sub_account_overseer()` scoping helpers; `set_sub_account_txn_actor()` trigger; group-isolation RLS; audit triggers; idempotent CMO+CWO seed); `lib/subAccounts/{types,api,validation,search}.ts` (totals/MTD/CSV/period helpers); `routes/sub-accounts/{SubAccountManagerPage,MonthlySummaryPanel,ReportStatusChip}` (balance + MTD cards, inline income/expense form, filtered ledger, group-scoped CSV export, monthly summary); Edge Function `submit-sub-account-report` (role + `sub_account_users` assignment check, server-side opening/income/expense/closing snapshot, acknowledged-freeze) reusing the `_shared` scaffolding; role helpers `canManageSubAccounts`/`canOverseeSubAccounts`/`canViewSubAccounts` + sub-accounts nav aligned to the viewer set; route wired in `App.tsx`. Enhanced the test `fakeDb` builder to chain `.order().order()`. **382/382 tests green (53 files), lint 0 errors, `tsc -b` + `vite build` clean.** §4 snapshot + tracker → Sprint 6 code-complete; §5F stories + checklist marked ✅; §7 decisions log appended. Carry-forward (owner, personal network): apply migration `20260630160000` via Studio SQL Editor, deploy `submit-sub-account-report`, assign Group FS users to CMO/CWO via `sub_account_users` (no new Storage bucket). 12 migrations total. |
| 1.9 | 2026-06-30 | **Sprint 6 done + pushed; Sprint 7 opened.** Owner cloud-applied migration `20260630160000` via Studio SQL Editor, deployed the `submit-sub-account-report` Edge Function, assigned the CMO/CWO Group FS users via `sub_account_users`, and smoke-tested the live flow (record inflow/outflow, balance + MTD cards, group-scoped CSV export, monthly summary submit, Group-FS-A-can't-see-B isolation, overseer read-only, audit rows). Fixed the audit-verification query column names (`audit_log` uses `entity`/`action`, not `table_name`). Sprint 6 committed + pushed to `origin/main` (`8954839`). §4.1 snapshot + §4.2 tracker → Sprint 6 Done / Sprint 7 active; §5F re-titled as the Sprint 6 archive; new §5G Sprint 7 detail added (stories 7.1–7.6, done checklist, scope guards incl. the open PDF-export decision for story 7.4). |
