# Project Backlog — Sprint Plan

## Project: NICC-SJ Finance & Membership Portal

**Organization:** Nigerian Igbo Catholic Community of San Jose, CA (NICC-SJ)
**Backlog Version:** 0.1 (Draft — for review)
**Last Updated:** June 7, 2026
**Manager:** Project Manager (this document)
**Source of Truth:** `docs/PRD.md` v0.4, `docs/UX.md` v0.1, `docs/technology.md` v0.2, `docs/graphics.md` v0.2

---

## 1. Purpose

This backlog turns the PRD's milestones (M0 → M7) into a sprint-ordered plan. It is organized so that:

- Foundations come first (no feature can land without auth, RLS, and the design system).
- Each sprint is independently shippable and demoable.
- Dependencies flow forward: a later sprint never depends on something not yet built.
- Risky/cross-cutting items (signature gating, RLS testing, accessibility) appear early enough that they don't surprise launch.

Volunteer reality: **sprints are scoped to be small, demoable, and reviewable in a single working session.**

---

## 2. Cadence & Conventions

- **Sprint length:** 2 calendar weeks (volunteer-friendly; adjust as needed).
- **Sprint capacity assumption:** ~10 story points per sprint for a single volunteer engineer; double if a second engineer is active. Estimates are deliberately conservative.
- **Definition of Ready (DoR):**
  1. Story has acceptance criteria.
  2. Story references the PRD/UX/technology/graphics section it satisfies.
  3. Dependencies are merged.
- **Definition of Done (DoD):**
  1. Code merged to `main` via PR with at least one review.
  2. CI passes (lint, typecheck, unit tests, build).
  3. RLS policies (if any) tested against expected and forbidden access.
  4. Accessibility: keyboard navigable, color contrast OK, status uses icon + label + color.
  5. Audit-log entries written for any financial mutation.
  6. Updated runbook (if operational impact) under `docs/runbooks/`.
  7. Demoed at sprint review.
- **Estimation scale:** S=1, M=3, L=5, XL=8 story points.
- **Priority labels:** P0 (must-have for v1), P1 (should-have), P2 (nice-to-have).

---

## 3. Sprint Roadmap (At a Glance)

| Sprint | Theme | PRD Milestone | Outcome |
|---|---|---|---|
| **Sprint 0** | Project foundations | M0 | Repo, CI/CD, hosted Supabase dev project, design tokens, logo derivatives, CSP, error boundary |
| **Sprint 1** | Auth + RBAC + RLS skeleton | M0–M1 | Login (email + member number), magic-link reset, RLS scaffolding, role-aware shell |
| **Sprint 2** | Member management (admin) | M1 | Members CRUD, households, CSV import for the 78 members / 89 families |
| **Sprint 3** | Member self-service portal | M1 | Member dashboard, profile edit, family contribution view (read-only) |
| **Sprint 4** | Contributions ledger | M2 | Categories, contribution entry, ledger UI, audit triggers |
| **Sprint 5** | Treasurer expenses + Chaplain approvals | M3 | Expense create/submit/approve/reject Edge Functions, Finance Council notification |
| **Sprint 6** | CMO / CWO Sub-Account Manager pages | M4 | Group-scoped income/expense, monthly summary submission Edge Function |
| **Sprint 7** | Reports & Finance Council aggregate dashboard | M4 | Aggregate KPIs, charts with table fallback, CSV/PDF exports |
| **Sprint 8** | Financial Secretary signature + End-of-Year summary | M5 | Signature upload, `generate-annual-summary` Edge Function, generation gate |
| **Sprint 9** | Hardening: Admin Console, audit log explorer, `/admin/health` | M6 | Admin tools, RLS test suite, accessibility pass, runbooks |
| **Sprint 10** | Data migration, training, v1 launch | M7 | Production import, leadership training, go-live |
| **Sprint 11+** | Post-v1 (notifications v1.5, Igbo i18n content) | v1.5 | Email reminders, language pack |

---

## 3a. Scope Changes / Decisions Log

- **2026-09 — Member self-service paused.** The org runs the portal as a
  leadership/back-office tool; ordinary members are **not** given logins.
  Implemented as a soft, reversible flag `MEMBER_SELF_SERVICE_ENABLED` (`false`)
  in `src/lib/auth/roles.ts` — routes, RLS, and the `member` role are retained
  and re-enable by flipping the flag. Admin Console no longer offers `member` as
  an assignable role. Affects **Sprint 3** (paused) and **story 10.4** (member
  rollout deferred). The `members` roster, contributions, households, and reports
  are unchanged. Annual tax summaries are generated/distributed by leadership.

- **2026-09 — Household Family Number added (approved scope change).** The
  community's legacy roster numbers **families**, not individuals, and members
  already quote that number when donating; it is also wanted for end-of-year
  tax summation. `households.family_number` (unique, never reused) was added in
  migration `20260919120000__household_family_number.sql` and surfaced on the
  Households page, the contribution entry + ledger pickers, the dues widget, and
  the Annual Summary PDF. `members.member_number` is unchanged and remains the
  internal per-person roster id. Sequenced deliberately **before** story 10.2 so
  the import numbers each household once instead of backfilling.

---

## 4. Sprint-by-Sprint Backlog

> Each sprint lists user stories with priority and estimate. Tasks marked **[BLOCKER]** must complete before the sprint ends or the dependent sprint slides.

---

### 4.1 Sprint 0 — Project Foundations *(M0)*

**Sprint Goal:** A skeleton app builds and deploys to GitHub Pages, talks to a hosted Supabase dev project, follows the brand, and captures runtime errors.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 0.1 | **[BLOCKER]** Create GitHub repo with branch protection on `main` and Dependabot enabled | P0 | S | tech §8 |
| 0.2 | **[BLOCKER]** Bootstrap Vite + React + TypeScript (strict) project with ESLint + Prettier + Vitest | P0 | M | tech §3 |
| 0.3 | Install Tailwind CSS and apply theme tokens (colors, type, spacing, radius, shadows) per `docs/graphics.md` §3–§5 | P0 | M | gfx §3–§5 |
| 0.4 | Install shadcn/ui base components into `src/components/ui` (Button, Input, Card, Dialog, Toast, Table, Tabs) | P0 | M | tech §3, gfx §8 |
| 0.5 | Produce logo derivatives from `logo.jpg` and commit to `public/brand/` (svg, 256/512 png, on-dark png, favicons) | P0 | M | gfx §7.2 |
| 0.6 | Configure two GitHub Actions workflows: `ci.yml` (lint, typecheck, unit, build) and `deploy.yml` (deploy to GitHub Pages) | P0 | M | tech §8.2 |
| 0.7 | Provision hosted Supabase **dev** project; commit `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (anon key only) | P0 | S | tech §8.3 |
| 0.8 | Add strict CSP via `<meta>` tags in `index.html` | P0 | S | tech §9 |
| 0.9 | Implement top-level React error boundary that writes to `client_errors` table (table + RLS to be added in Sprint 1) | P0 | M | PRD §4.11 |
| 0.10 | App shell: top bar with logo placeholder, role badge slot, language selector skeleton; left nav drawer | P0 | M | gfx §8.9, UX §4.1 |
| 0.11 | Repo README with the bootstrap steps from `docs/technology.md` §16 | P0 | S | tech §16 |

**Definition of Done for Sprint 0:** A blank but branded app deploys to GitHub Pages on every merge to `main`.

---

### 4.2 Sprint 1 — Auth + RBAC + RLS Skeleton *(M0–M1)*

**Sprint Goal:** Users can log in (email or member number), reset their password, and the app routes/render adapts to their role. Postgres RLS is the source of truth.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 1.1 | **[BLOCKER]** Initial Supabase migration: create `users`, `members`, `households`, `categories`, `audit_log`, `client_errors` tables with conventions (numeric(12,2), timestamptz, soft delete) | P0 | L | PRD §6.3 |
| 1.2 | **[BLOCKER]** Define app roles enum and `auth.app_role()` Postgres helper | P0 | M | PRD §4.1, tech §6.2 |
| 1.3 | RLS policies for `users`, `members`, `households` matching PRD §7 (skeleton — refined later) | P0 | L | PRD §7 |
| 1.4 | Audit-log trigger framework: generic trigger that writes before/after JSON for any financial table | P0 | M | PRD §5 |
| 1.5 | Login page: email-or-member-number + password (member-number resolves to email server-side) with logo, gold rule, language selector | P0 | M | PRD §4.1, gfx §8.10 |
| 1.6 | Magic-link password reset flow | P0 | M | PRD §4.1, §4.7 |
| 1.7 | Optional TOTP 2FA enrollment for admin roles (UI gated for those roles) | P1 | L | PRD §4.1 |
| 1.8 | Role-aware app shell: nav items show/hide by role; "Access denied" friendly page for forbidden routes | P0 | M | UX §4.4 |
| 1.9 | Session timeout warning before forced logout | P1 | S | UX §4.4 |
| 1.10 | Add `client_errors` RLS (insert any authenticated, read admin only) and confirm error boundary writes work end-to-end | P0 | S | PRD §4.11 |

**Demo:** Log in with seed users for each role; verify each role sees the right nav and is blocked from forbidden routes.

---

### 4.3 Sprint 2 — Member Management (Admin) *(M1)*

**Sprint Goal:** Financial Secretary / Admin can manage the membership directory and import the existing 78 members / 89 families.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 2.1 | **[BLOCKER]** Sequential `member_number` generator (auto next, manual override allowed by admin) | P0 | M | PRD §4.2 |
| 2.2 | Members list page with search + filter (active/inactive, household) | P0 | M | PRD §4.2, UX §5.2 |
| 2.3 | Create / edit member form (RHF + Zod) — name, email, phone, address, household, role-in-household, baptism status, status | P0 | L | PRD §4.2 |
| 2.4 | Household management: create household, designate primary member, add spouse/children | P0 | M | PRD §4.2 |
| 2.5 | Soft-delete (deactivate) member with confirmation dialog | P0 | S | PRD §4.2 |
| 2.6 | CSV import (PapaParse): validate with Zod, preview, import via Edge Function with audit entries | P0 | L | PRD §4.2, tech §14 |
| 2.7 | Audit-log writes for member create/update/deactivate | P0 | S | PRD §5 |
| 2.8 | Permissions matrix QA: confirm Treasurer/Member/Council cannot reach member CRUD routes | P0 | S | PRD §7 |

**Demo:** Import a sample CSV; create a new household and member; deactivate a former member.

---

### 4.4 Sprint 3 — Member Self-Service Portal *(M1)* — ⏸️ Paused (org decision 2026-09: member self-service logins paused; portal runs as a leadership/back-office tool). Code retained behind the `MEMBER_SELF_SERVICE_ENABLED` flag (`src/lib/auth/roles.ts` = `false`); flip to `true` to restore. The `members` roster, contributions, households, and reports are unaffected.

**Sprint Goal:** A member can log in, see their family's information, and prepare to view contributions (read-only path is wired even if no contributions exist yet).

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 3.1 | Member dashboard: "This Year at a Glance" KPI card (placeholder totals = $0 until Sprint 4) | P0 | M | UX §5.1, gfx §10.1 |
| 3.2 | Profile page: view + edit own contact info, household details | P0 | M | PRD §4.2, UX §5.1 |
| 3.3 | Family contributions page (read-only) — empty-state component with helpful copy | P0 | S | UX §4.3 |
| 3.4 | Language selector wired to `react-i18next`; English strings extracted; Igbo placeholder bundle | P0 | M | PRD §4.8 |
| 3.5 | Accessibility pass on member-facing pages (keyboard, contrast, focus rings, tap targets) | P0 | S | NFR §5 |

**Demo:** A member account logs in, edits their phone, and sees the empty "no contributions yet" state.

---

### 4.5 Sprint 4 — Contributions Ledger *(M2)*

**Sprint Goal:** Financial Secretary records dues and donations; members can see their family's running history.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 4.1 | **[BLOCKER]** Migration: `contributions` table + RLS policies; seed standard categories (CMO Dues, CWO Dues, Harvest, Building Fund, Donations parent, Offertory, legacy household dues flagged inactive-ready) | P0 | L | PRD §4.3, §6.3 |
| 4.2 | Add Contribution form: typeahead member/household, category, amount, date (default today), method, notes | P0 | L | PRD §4.3, UX §6.2 |
| 4.3 | Ad-hoc donation sub-categories: create from the form when needed | P0 | M | PRD §4.3 |
| 4.4 | Contributions list/ledger page (admin) with filters (date, category, household, member) | P0 | M | PRD §4.3 |
| 4.5 | Edit/correct an existing entry with reason; audit trail visible | P0 | M | PRD §4.3 |
| 4.6 | Member-side: family contribution chart by year/category + table fallback toggle | P0 | M | PRD §4.6, UX §5.1 |
| 4.7 | Annual dues tracking widget: which households have paid for the current year | P1 | M | PRD §4.3 |
| 4.8 | "Time-to-record-a-contribution" measured at <30 sec on a fresh form | P0 | S | PRD §11 |

**Demo:** Record three contributions across categories; show a member account viewing only their own family's totals.

---

### 4.6 Sprint 5 — Expenses + Chaplain Approvals *(M3)*

**Sprint Goal:** Treasurer submits expenses; Chaplain approves/rejects; Finance Council is notified.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 5.1 | **[BLOCKER]** Migration: `expenses`, `expense_notifications` tables + RLS | P0 | L | PRD §6.3 |
| 5.2 | **[BLOCKER]** Private Supabase Storage bucket for receipts; signed-URL helper | P0 | M | PRD §4.4, tech §9 |
| 5.3 | Edge Function `submit-expense` (validates role, creates expense pending, fans out notifications) | P0 | L | PRD §6.4 |
| 5.4 | Edge Function `approve-expense` / `reject-expense` (role check, status transition, audit, rejection reason mandatory) | P0 | L | PRD §4.4, §6.4 |
| 5.5 | Treasurer expense pages: create + list with status chips and rejection reasons | P0 | M | PRD §4.4, UX §5.3 |
| 5.6 | Chaplain Approval Queue (oldest first) + side-drawer detail with Approve/Reject controls | P0 | L | UX §5.5, gfx §10.3 |
| 5.7 | Finance Council notification feed (in-app for v1; email follows in v1.5) | P0 | M | PRD §4.4, §4.7 |
| 5.8 | Audit entries on every state change | P0 | S | PRD §5 |
| 5.9 | Permissions QA: only Chaplain (and Admin) can flip status | P0 | S | PRD §7 |

**Demo:** Treasurer submits an expense with a receipt; Council sees the notification; Chaplain approves; status reflects everywhere.

---

### 4.7 Sprint 6 — CMO/CWO Sub-Account Manager Pages *(M4)*

**Sprint Goal:** Each Group Financial Secretary manages a single, scoped sub-account ledger and submits a monthly summary.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 6.1 | **[BLOCKER]** Migrations: `sub_accounts`, `sub_account_users`, `sub_account_transactions`, `sub_account_reports` + RLS scoping by `sub_account_users` | P0 | L | PRD §4.5, §6.3 |
| 6.2 | Seed CMO + CWO sub-accounts; Admin assigns Group Financial Secretary users | P0 | S | PRD §4.5 |
| 6.3 | Sub-Account Manager page (scoped by RLS): balance card, MTD in/out, income form, expense form, transaction ledger with filters, group-only export (CSV/PDF) | P0 | XL | PRD §4.5, UX §5.4, gfx §10.4 |
| 6.4 | Edge Function `submit-sub-account-report`: snapshot opening/income/expense/closing, immutable record | P0 | L | PRD §6.4 |
| 6.5 | Monthly Summary panel with status chip (Draft/Submitted/Acknowledged) | P0 | M | UX §5.4 |
| 6.6 | Permissions QA: Group FS A cannot see Group FS B's data via UI or direct API/RLS | P0 | M | PRD §7 |

**Demo:** Each Group FS records inflow/outflow only for their group, then submits the monthly summary.

---

### 4.8 Sprint 7 — Reports & Finance Council Dashboard *(M4)* — ✅ Done (migration `20260630170000` cloud-applied; demoed 2026-08-17)

**Sprint Goal:** Leadership and Council have meaningful aggregate views, with chart + table fallback and PDF/CSV exports.

| # | Story | Priority | Est | Refs | State |
|---|---|---|---|---|---|
| 7.1 | Treasurer Finance Dashboard: Income / Expense / Net Balance / Pending Approvals KPIs; trend chart; category split chart; expenses table | P0 | L | UX §5.3, gfx §10.2 | ✅ Done |
| 7.2 | Finance Council Oversight Dashboard (read-only): aggregate KPIs, trend, category breakdown, participation rate, sub-account rollups; persistent "aggregate-only" banner | P0 | L | PRD §4.6, UX §5.6, gfx §10.5 | ✅ Done (income/participation via aggregate RPCs; migration `20260630170000` applied) |
| 7.3 | Charts + "View as table" toggle for accessibility | P0 | M | NFR §5 | ✅ Done |
| 7.4 | Monthly / Quarterly / Annual report views with PDF + CSV export | P0 | L | PRD §4.6 | ✅ Done (PDF = `window.print()`) |
| 7.5 | Sub-account rollups visible to Council (opening/in/out/closing); no per-member drill-down rendered | P0 | M | PRD §4.6 | ✅ Done |
| 7.6 | Permissions QA: confirm Council never gets per-member data, even via direct URL | P0 | S | PRD §7 | ✅ Done |

**Demo:** Council member opens the dashboard, sees trends and CMO/CWO rollups, exports a quarterly PDF.

---

### 4.9 Sprint 8 — Financial Secretary Signature + End-of-Year Summary *(M5)* — ✅ Done (2026-07-05; Edge Function deployed + migration cloud-applied + FS signature on file; committed `14bc561`)

**Sprint Goal:** Issue the official, signed End-of-Year Family Contribution Summary PDF — the most public artifact of the system.

| # | Story | Priority | Est | Refs | State |
|---|---|---|---|---|---|
| 8.1 | **[BLOCKER]** Migration: add `users.fin_sec_signature_path` nullable; private Storage bucket `signatures/` with strict RLS (FS owner + Admin only) | P0 | M | PRD §4.10, §6.3 | ✅ Done (`20260703170000__signatures_storage.sql` — private bucket + object RLS + `users_update_own_signature`; **apply migration**) |
| 8.2 | Financial Secretary profile screen: upload / replace / remove signature image (PNG transparent, ~180×60); audit-logged | P0 | L | PRD §4.10 | ✅ Done (`SignaturePage` + `lib/signatures/storage.ts`; audit via users AFTER trigger) |
| 8.3 | Edge Function `generate-annual-summary`: fetch family-year totals, render PDF with logo header + signature block + disclaimer; **return error if no signature on file** | P0 | XL | PRD §4.6, gfx §11 | ✅ Done (pdf-lib server render; 409 `FS_SIGNATURE_REQUIRED` gate; **deploy function**) |
| 8.4 | UI: "Generate / Download Annual Summary" for the family head, FS, Treasurer, Chaplain, Admin | P0 | M | PRD §4.6, §7 | ✅ Done (`AnnualSummaryPage` + `lib/annualSummary/api.ts`) |
| 8.5 | Friendly error UX when generation is blocked: *"Financial Secretary signature is required before annual summaries can be issued."* | P0 | S | PRD §4.6 | ✅ Done (blocked alert on `SignatureRequiredError`) |
| 8.6 | PDF visual QA against `docs/graphics.md` §11 (logo size/clear-space, gold rule, signature block, footer, page numbers) | P0 | M | gfx §11 | ✅ Done (layout coded to gfx §11; live visual QA at demo) |
| 8.7 | Optional: Verification hash (last 8 chars of SHA-256 of payload) printed in footer | P2 | S | gfx §11.4 | ⏭️ Deferred (P2 — not in v1 scope) |

**Demo:** Without a signature on file, generation is blocked with a clear message. Upload a signature; regenerate the PDF; verify logo + signature appear correctly.

---

### 4.10 Sprint 9 — Hardening: Admin Console, Audit, Health, Accessibility *(M6)* — ✅ Done (all 10 stories; 497 tests pass; 2026-07-08)

**Sprint Goal:** Operational readiness for a volunteer-run system.

| # | Story | Priority | Est | Refs | State |
|---|---|---|---|---|---|
| 9.1 | Admin Console: users list + role assignment (with confirmation step for elevation) | P0 | L | PRD §4.11 | ✅ Done |
| 9.2 | Role-permission matrix view (mirrors PRD §7) | P0 | M | PRD §4.11 | ✅ Done |
| 9.3 | Audit log explorer with filters (user, entity, action, date) | P0 | L | PRD §4.11 | ✅ Done |
| 9.4 | `/admin/health` page: last deploy SHA, last backup date, recent client error count, Supabase status indicator | P0 | M | PRD §4.11 | ✅ Done |
| 9.5 | Category management UI (activate/deactivate; phase-out flag for legacy $20 dues) | P0 | M | PRD §4.3, §4.11 | ✅ Done |
| 9.6 | Sub-account & Group FS assignment UI (Admin) | P0 | M | PRD §4.11 | ✅ Done |
| 9.7 | RLS policy test suite (e.g., pgTAP) covering every PRD §7 row | P0 | L | PRD risks | ✅ Done (verified vs dev DB 2026-07-06; `npm run test:rls`) |
| 9.8 | Accessibility audit (Lighthouse + axe DevTools) on the 5 key pages; fix to score ≥ 90 | P0 | M | PRD §11, NFR §5 | ✅ Done (axe A/AA gate + owner Lighthouse ≥ 90, 2026-07-08) |
| 9.9 | Runbooks under `docs/runbooks/`: `backup.md`, `add-user.md`, `deploy.md`, `monthly-checks.md` | P0 | M | tech §20 | ✅ Done |
| 9.10 | Performance budget pass: First Load JS < 250 KB gzipped; dashboards render < 3 s | P0 | M | NFR §5 | ✅ Done (gzip JS 232 KB; dashboards < 3 s, owner 2026-07-08) |

**Demo:** Walk an admin through onboarding a new Treasurer, viewing the audit log, and reviewing system health.

---

### 4.11 Sprint 10 — Data Migration, Training, v1 Launch *(M7)* — 🟡 In progress (planning + local prep done; execution owner-gated)

**Sprint Goal:** Real data is in production, leadership is trained, system goes live.

| # | Story | Priority | Est | Refs | State |
|---|---|---|---|---|---|
| 10.1 | **[BLOCKER]** Provision Supabase **prod** project; run all migrations; configure secrets in GitHub Actions | P0 | M | tech §8.3 | ✅ Done (prod project provisioned; all migrations applied; Actions secrets configured, 2026-08-17) |
| 10.2 | Production data import: 78 members / 89 families via CSV import; verify member-number range continues correctly | P0 | L | PRD §4.2, §9.2 | 🟡 Ready — owner-gated (gate 7); `docs/templates/members-import-template.csv` prepped |
| 10.3 | Onboard real role-holders (Chaplain, Treasurer, FS, Group FS x2, Council, Admin) and verify 2FA enrollment policy | P0 | M | PRD §4.1 | 🟡 Ready — owner-gated (gate 8); follow `runbooks/add-user.md` |
| 10.4 | Training sessions: 1 for FS/Treasurer/Group FS (admin tasks), 1 for Council/Chaplain. Member-facing rollout **deferred** (self-service paused, 2026-09) | P0 | L | PRD risks | ⏳ Owner-led; agent can draft session outlines on request |
| 10.5 | First monthly backup run + restore drill from `docs/runbooks/backup.md` | P0 | M | NFR §5 | 🟡 Ready — owner-gated; follow `runbooks/backup.md` §2–§3 |
| 10.6 | Issue a real End-of-Year summary for one consenting family as a launch-readiness check | P0 | S | PRD §4.6 | ⏳ Owner-gated (gate 9); FS signature already validated (Sprint 8) |
| 10.7 | Cutover: redirect domain (if applicable), publish portal link to community | P0 | S | PRD §10 | ⏳ Owner-led (gate 4); follow new `runbooks/go-live.md`; custom domain deferred (§9.2 Q10) |

**Demo:** Leadership generates and distributes a signed Annual Summary for a family (member self-service paused, 2026-09). Council reviews real aggregate dashboards.

---

### 4.12 Sprint 11+ — Post-v1 (Notifications v1.5, Igbo i18n) *(v1.5)*

**Sprint Goal:** Reduce manual work and broaden inclusivity.

| # | Story | Priority | Est | Refs |
|---|---|---|---|---|
| 11.1 | Edge Function `send-reminders` driven by `pg_cron`: unpaid dues reminder, monthly summary nudge | P1 | L | PRD §4.7, §6.4 |
| 11.2 | Email confirmation when a contribution is recorded | P1 | M | PRD §4.7 |
| 11.3 | Email notification to Finance Council on new expense; per-expense vs digest decision | P1 | M | PRD §4.7, §9.2 |
| 11.4 | Email branded header with logo (`logo-on-dark.png`) | P1 | S | gfx §7 |
| 11.5 | Igbo translation pack landed and toggled on for production | P1 | L | PRD §4.8 |
| 11.6 | Optional: add a custom domain (e.g., `portal.niccsj.org`) with Cloudflare for HTTP security headers | P2 | M | PRD §9.2 |
| 11.7 | Optional: PDF verification hash + verification page | P2 | M | gfx §11.4 |
| 11.8 | Optional: Excel (.xlsx) export, if requested by Council | P2 | M | tech §13 |
| 11.9 | Optional: dark mode | P2 | L | gfx §15 |
| 11.10 | **Consolidated Financial Statement (FS):** single printable report combining the general/main ledger (income by category + expenses) and **all** CMO/CWO sub-accounts (opening/income/expense/closing per group), with a grand-total parish position, for community-meeting presentation. FS/Treasurer/Admin (Chaplain deferred — needs an RLS read grant on sub-account snapshots to match PRD §7); period selector; `window.print()` PDF + CSV export | P1 | L | PRD §4.5, §4.6, §7 |

---

## 5. Dependency Graph (Critical Path)

```
Sprint 0  →  Sprint 1  →  Sprint 2  →  Sprint 3
                                    ↘
                                      Sprint 4 ─→ Sprint 5 ─→ Sprint 6 ─→ Sprint 7 ─→ Sprint 8 ─→ Sprint 9 ─→ Sprint 10
```

Hard dependencies:
- Sprint 1 must precede every functional sprint (auth + RLS + audit framework).
- Sprint 2 (members/households) precedes Sprint 4 (contributions reference members).
- Sprint 4 (contributions) precedes Sprint 8 (annual summary needs real data).
- Sprint 5 (expenses/approvals) precedes Sprint 7 (Treasurer/Council dashboards consume expense data).
- Sprint 6 (sub-accounts) precedes Sprint 7 (Council dashboard shows sub-account rollups).
- Sprint 8 must complete before Sprint 10 (no production launch without signed summaries).

---

## 6. Risk-Based Sprint Notes

| Risk (PRD §10) | Sprint addressing it | How |
|---|---|---|
| PII / financial data leak | 1, 5, 6, 9 | RLS skeleton, signed Storage URLs, RLS policy tests |
| Volunteer turnover | 0, 9 | README, runbooks, simple toolset |
| Adoption resistance | 4, 10 | Fast contribution entry; structured training |
| Data loss | 9, 10 | Backup runbook, restore drill |
| Summary issued without authority | 8 | Generation gate + signature requirement |
| Logo / brand asset drift | 0, 8, 11 | `logo.jpg` is single source of truth; derivatives reviewed each release |
| RLS misconfiguration | 9 | pgTAP test suite covering PRD §7 |

---

## 7. Sprint Ceremonies (Lightweight)

- **Planning:** start of sprint, ~30 min — confirm scope, DoR, dependencies.
- **Mid-sprint check-in:** ~15 min — surface blockers early.
- **Review/demo:** end of sprint — demo to Owner; capture feedback as new backlog items.
- **Retro:** ~15 min — what worked, what to change next sprint.

For a single-volunteer cadence these can collapse into a single 30-minute weekly check-in plus a written sprint review.

---

## 8. Open Items Carried From PRD §9.2

These can be resolved any time, but several are needed for specific sprints:

| # | Question | Needed by Sprint |
|---|---|---|
| 1 | Replacement dues structure for legacy $20 household dues | Sprint 4 (categories) |
| 2 | Chaplain account holder + backup approver | Sprint 5 (approvals) |
| 3 | Council notifications: per-expense vs digest | Sprint 11+ |
| 4 | Existing digital member roster for import | Sprint 2 / Sprint 10 |
| 5 | Igbo orthography source | Sprint 11+ |
| 6 | Exact FS printed name + title for signature block | Sprint 8 |
| 7 | Vector logo source (or trace `logo.jpg`?) | Sprint 0 |
| 8 | 2FA mandatory or opt-in for admin | Sprint 1 / Sprint 10 |
| 9 | Verification hash on Annual Summary in v1 or v1.5? | Sprint 8 |
| 10 | Custom domain `portal.niccsj.org`? | Sprint 10 / Sprint 11+ |
| 11 | Should the Annual Summary become an **official IRS charitable-contribution tax receipt** (org EIN/tax-exempt status, "no goods/services provided" statement, $250+ acknowledgment language)? Currently a personal record-keeping doc with a "Not an official IRS tax receipt" disclaimer. | Sprint 11+ (post-v1) |

---

## 9. Backlog Hygiene

- This file is the **living plan**. Update it at the end of every sprint review.
- New stories created during a sprint are added to the appropriate future sprint, never silently inserted into the current one.
- Items deferred beyond v1 move to **Sprint 11+** with a P-label.
- Do not exceed the per-sprint capacity assumption without written reasoning in the sprint review notes.
