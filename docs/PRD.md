# Product Requirements Document (PRD)

## Project: NICC-SJ Finance & Membership Portal

**Organization:** Nigerian Igbo Catholic Community of San Jose, CA (NICC-SJ)
**Document Version:** 0.5 (Draft)
**Last Updated:** June 15, 2026
**Owner:** Gozie E. Okwelume
**Status:** Draft — consolidated with UX, Technology, and Graphics specifications
**Companion Documents:** [`docs/UX.md`](UX.md), [`docs/technology.md`](technology.md), [`docs/graphics.md`](graphics.md)

---

## 1. Overview

### 1.1 Purpose
The NICC-SJ Finance & Membership Portal is a web application that enables the Nigerian Igbo Catholic Community of San Jose to digitally manage its membership records, track member dues and donations, and provide leadership (Chaplain, Treasurer, Financial Secretary, and Finance Council) with transparent financial reporting tools.

### 1.2 Background
NICC-SJ is a faith-based nonprofit Catholic community. Currently, membership and financial tracking is done manually (or via spreadsheets), which is error-prone, hard to audit, and gives members limited visibility into their own contribution history. A centralized portal will:
- Reduce administrative overhead for the Treasurer and Financial Secretary.
- Empower members to self-service their profile and view their contribution history.
- Give the Finance Council a high-level dashboard to oversee the community's financial health.

### 1.3 Goals
1. Provide a secure, role-based portal for members and leadership.
2. Track membership dues, donations, and other contributions per member, per year.
3. Allow members to view their own giving history and update their personal info.
4. Give Chaplain/Treasurer/Financial Secretary full administrative control over financial records.
5. Give the Finance Council a read-only oversight dashboard with summarized financials.
6. Be hostable on GitHub (GitHub Pages or via GitHub-integrated hosting).
7. Provide a modern, accessible, bilingual-ready visual experience consistent with the brand specified in `docs/graphics.md`.
8. Produce **official, signed** End-of-Year family contribution summaries that include the organization's logo and the Financial Secretary's signature.

### 1.4 Non-Goals (v1)
- **Online payment processing (Stripe/PayPal/Zelle integration) — explicitly out of scope.** The portal is strictly a record-keeping tool; members will not pay online in v1 or v2 unless the council later changes direction.
- Full IRS-compliant tax receipt letter generation — v2. (v1 *will* provide a per-family contribution summary suitable for personal tax preparation — see §4.6.)
- Full accounting/ledger replacement (e.g., QuickBooks integration) — v2.
- Mobile native apps — responsive web only in v1.
- Mass email/SMS communications — v2.
- Native Excel (.xlsx) export — v1 ships PDF + CSV only; CSV opens cleanly in Excel/Google Sheets (see `docs/technology.md` §13).
- Dark mode — v1.5 or later (see `docs/graphics.md` §15).
- End-to-end (Playwright) tests in CI — deferred past v1 to keep the toolset volunteer-maintainable (see `docs/technology.md` §3.1).

---

## 2. Stakeholders & User Roles

| Role | Description | Access Level |
|---|---|---|
| **Member** | Registered community member (family unit) | View own family profile, update own info, view own contribution history, download annual contribution summary for tax purposes |
| **Financial Secretary** | Records contributions and dues; **owner of the official signature** that appears on End-of-Year summaries | Admin: full CRUD on members, dues, donations; full per-member visibility; manages own signature image |
| **Treasurer** | Manages funds, expenses, reporting | Admin: full CRUD on financial records, expenses, reports; full per-member visibility |
| **Group Financial Secretary (CMO/CWO)** | Manages one sub-account (CMO or CWO), records group income/expenses, submits reports upward | Limited admin: CRUD on own group sub-account transactions only; cannot access other groups or global ledger controls |
| **Chaplain** | Spiritual leader and ultimate approver of expenses | Full per-member visibility; final approval authority on expenses |
| **Finance Council** | Oversight committee | Read-only access to **aggregate** financial summaries and reports; notified of expenses; **no per-member drill-down** |
| **System Admin (Tech Owner)** | Technical owner who runs the platform on GitHub Pages + Supabase | Full system access, user role management, category/sub-account management, audit log access, backup verification |

---

## 3. User Stories

### 3.1 Member
- As a member, I want to log in with my member number / email so I can access my account.
- As a member, I want to view and update my personal information (address, phone, email, family members).
- As a member, I want to see how much my family has contributed in a given year, broken down by category (CMO Dues, CWO Dues, Harvest, Building Fund, Donations, Offertory, etc.).
- As a member, I want to download an **annual contribution summary for my family** (PDF/CSV) showing total dues and total donations, suitable for personal tax preparation.
- As a member, I want to reset my password securely.
- As a member, I want to optionally view the portal in **English or Igbo** (nice-to-have).

### 3.2 Financial Secretary
- As the Financial Secretary, I want to register new members and assign them a unique member number.
- As the Financial Secretary, I want to record dues payments per member.
- As the Financial Secretary, I want to record donations and categorize them.
- As the Financial Secretary, I want to edit/correct entries with an audit trail.
- As the Financial Secretary, I want to deactivate members who have left.
- As the Financial Secretary, I want to **upload and update my official signature image** so that End-of-Year family contribution summaries can be issued under my signature.

### 3.3 Treasurer
- As the Treasurer, I want to record expenses against categories.
- As the Treasurer, I want to submit expenses for **Chaplain approval** and **notify the Finance Council**.
- As the Treasurer, I want to view current account balances by fund/category.
- As the Treasurer, I want to generate monthly, quarterly, and annual financial reports.
- As the Treasurer, I want to generate **per-family annual contribution statements** (for members' tax purposes).
- As the Treasurer, I want to export reports to PDF/Excel.

### 3.4 Chaplain
- As the Chaplain, I want to review and **approve or reject** expenses submitted by the Treasurer.
- As the Chaplain, I want full visibility into per-member contribution and expense data.
- As the Chaplain, I want to view the same aggregate dashboards as the Finance Council.

### 3.5 Group Financial Secretary (CMO/CWO)
- As a Group Financial Secretary, I want a dedicated page for my group (CMO or CWO) so I can manage my group's incoming and outgoing funds.
- As a Group Financial Secretary, I want to record group income (dues, levies, donations, fundraising proceeds) into only my assigned sub-account.
- As a Group Financial Secretary, I want to record group expenses and attach notes/receipts so my records are complete and auditable.
- As a Group Financial Secretary, I want to see my sub-account running balance and monthly movement.
- As a Group Financial Secretary, I want to submit periodic summary reports to the central Financial Secretary and Finance Council.
- As a Group Financial Secretary, I want my access restricted to only my assigned group account.

### 3.6 Finance Council
- As a Finance Council member, I want a dashboard showing total income, total expenses, net balance, and trends.
- As a Finance Council member, I want to see contribution participation rates (% of families who paid dues).
- As a Finance Council member, I want to drill down into **category-level aggregates only** — I should **not** see per-member contribution details.
- As a Finance Council member, I want to be **notified of expenses** so I am aware of spending, even though the Chaplain holds final approval.
- As a Finance Council member, I want to export oversight reports.

### 3.7 System Admin (Tech Owner)
- As the System Admin, I want to create, deactivate, and reassign user accounts and roles safely.
- As the System Admin, I want to view a **role-permission matrix** that confirms each role's effective access.
- As the System Admin, I want to inspect the **audit log** by user, entity, action, and date.
- As the System Admin, I want to see **system health**: last deploy SHA, last backup date, recent client error count, and Supabase project status.
- As the System Admin, I want to manage contribution categories and CMO/CWO sub-account assignments.
- As the System Admin, I want to verify and trigger backups, and follow documented runbooks for routine operations.

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization
- Login by **email or member number** + password (member-number login resolves to the user's email server-side).
- Password reset via email **magic link**.
- Role-based access control (RBAC): Member, Financial Secretary, Treasurer, Group Financial Secretary (CMO/CWO), Chaplain, Finance Council, System Admin.
- Session management with Supabase Auth (short-lived JWT + refresh).
- **TOTP 2FA — Hybrid policy (confirmed 2026-06-15, see PM.md Decisions Log):**
  - **Mandatory** for **System Admin** — enrollment required at first login; the user cannot perform any admin action until TOTP is enrolled.
  - **Opt-in** for Financial Secretary, Treasurer, Group Financial Secretary (CMO/CWO), Chaplain, and Finance Council.
  - Members are never required to use 2FA.
  - Lost-device recovery for any 2FA-enrolled user is performed by System Admin via the Admin Console runbook (see §4.11).
- **Session timeout warning** appears before the user is logged out (UX §4.4).
- Authorization is enforced by **Postgres Row-Level Security (RLS)** in Supabase; no business permission logic lives only in the SPA (see `docs/technology.md` §6).

### 4.2 Member Management
- **Member numbering:** Members are assigned a **sequential serial number** (integer). Current range is 1–78; the system must continue this sequence and auto-assign the next available number on new member creation (with manual override allowed by admins).
- Membership is organized around the **family/household** as the primary unit (≈89 families today). Each household has a primary member (head of household) and may include spouse and children.
- Member profile: full name, member number, email, phone, address, date joined, household, baptism status (optional), spouse, children, status (active/inactive).
- Bulk import (CSV) for migrating existing records.
- Member search and filter.

### 4.3 Contributions & Dues
- Record contribution: member/household, date, amount, **category** (see below), payment method (cash, check, Zelle, etc.), notes.
- **Contribution categories (initial set):**
  - **CMO Dues** (Catholic Men's Organization)
  - **CWO Dues** (Catholic Women's Organization)
  - **Harvest** (biennial fundraising)
  - **Building Fund**
  - **Donations** (ad-hoc; the system must support creating new donation sub-categories on demand as needs arise — e.g., "Funeral Support — Family X", "Christmas Appeal")
  - **Offertory**
  - **(Legacy) Annual Household Dues — $20/household** — currently being phased out. The system must continue to record historical entries and allow recording during the phase-out period, but should support flagging this category as *deprecated/inactive* once retired.
- Annual dues tracking: which households have paid for the year.
- Receipts (printable / emailable).
- Audit log: who entered/edited, when.

### 4.4 Expenses
- Record expense: date, amount, category, payee, description, **receipt attachment (optional, stored in a private Supabase Storage bucket and accessed only via short-lived signed URLs)**.
- **Approval workflow (v1):**
  1. Treasurer records the expense (status = *Pending*).
  2. Finance Council is **notified** (email / in-app) so they are aware.
  3. **Chaplain** reviews and **approves or rejects** (Chaplain holds final authority); rejection requires a reason.
  4. Approved expenses are committed to the ledger; rejected expenses are archived with reason.
- The system must record the approver, decision, and timestamp on every expense for auditability.
- Expense status transitions (`pending` → `approved`/`rejected`) are executed via a server-side **Edge Function** that validates the caller's role and writes the audit entry (see `docs/technology.md` §7).

### 4.5 Group Sub-Account Management (CMO/CWO)
- The system must support named sub-accounts for **CMO** and **CWO**, each with separate balance tracking.
- Each Group Financial Secretary account is mapped to exactly one sub-account (`CMO` or `CWO`) and can only access that sub-account.
- Provide a dedicated **Sub-Account Manager Page** with:
  - Income entry form (date, amount, source/category, payment method, notes)
  - Expense entry form (date, amount, category, payee, notes, receipt attachment optional, private Storage with signed URLs)
  - Running balance card and monthly in/out summary
  - Transaction list with filters (date range, type, category)
  - Export (CSV/PDF) for that group only
- Group sub-account records must be visible to Financial Secretary, Treasurer, Chaplain, and Admin.
- Finance Council view of sub-accounts remains aggregate/reporting-focused and does not expose unrelated per-member details.
- Group Financial Secretary can submit a **monthly summary report**; submission runs through a server-side Edge Function that snapshots opening / income / expense / closing balances and writes an immutable record. The report is then visible to Financial Secretary and Finance Council.

### 4.6 Reporting & Dashboards
- **Member dashboard:** personal/family contribution chart by year and category. Every chart must be paired with a textual or tabular fallback (a “View as table” toggle) for accessibility.
- **Annual / End-of-Year Family Contribution Summary (Tax Summary):** Per-family, per-calendar-year PDF statement showing:
  - Total dues paid (broken out by CMO, CWO, legacy household dues, etc.)
  - Total donations (with category breakdown)
  - Grand total contributed
  - **Required visual elements (per `docs/graphics.md` §11):**
    - Header band containing the **official organization logo** (`logo.jpg` and its derivatives in `public/brand/`).
    - **Financial Secretary signature block:** signature image, printed name, title (“Financial Secretary, NICC-SJ”), and date issued.
    - Footer disclaimer: *“Provided for personal record-keeping. Not an official IRS tax receipt.”*
  - **Generation gate:** the system **must not** generate the summary if no Financial Secretary signature image is on file. It must instead surface a clear error: *“Financial Secretary signature is required before annual summaries can be issued.”*
  - Available to the family head, Financial Secretary, Treasurer, Chaplain, and Admin.
- **Admin dashboard (Treasurer / Financial Secretary / Chaplain):** total contributions, expenses, balance, recent transactions, per-member drill-down.
- **Group Financial Secretary dashboard/page:** own sub-account balance, income vs expense trend, recent transactions, and monthly summary report status.
- **Finance Council dashboard:** aggregate KPIs only — total income, total expenses, net balance, trends (monthly/yearly), participation rate, category breakdown. **No per-member drill-down.** A persistent banner reads: *“Aggregate view — per-member details are not shown.”*
- Finance Council can view CMO/CWO sub-account rollups (opening balance, income, expenses, closing balance) for oversight.
- **Exports (v1):** **PDF + CSV only.** No native Excel (.xlsx) in v1; CSV opens cleanly in Excel/Google Sheets (see `docs/technology.md` §13).

### 4.7 Notifications (v1.5)
- Email reminder for unpaid annual dues.
- Email confirmation when a contribution is recorded.
- Email notification to Finance Council when a new expense is submitted.
- Email notification to Chaplain when an expense awaits approval.
- Password reset email (magic link).
- Optional: Email reminder to Group Financial Secretaries when monthly sub-account summary is due.
- Transactional email is delivered via Supabase's built-in SMTP in v1; a dedicated provider (e.g., Resend) may be adopted later only if deliverability becomes a problem (see `docs/technology.md` §4, §8.1).

### 4.8 Internationalization (Nice-to-have, v1 or v1.5)
- Support **English** (default) and **Igbo** as UI languages.
- All user-facing strings must be externalized (i18n-ready) from day one even if Igbo translations land in a later milestone. Implementation via `react-i18next`.
- All visual components must accommodate **~30% longer strings** for Igbo without breaking layout (see `docs/graphics.md` §12).
- Language selector appears in the top bar (`languages` icon).
- Text must never be embedded inside images, so it stays translatable.

### 4.9 Identity, Branding & Visual System
- The official organization logo lives at the repository root as `logo.jpg` and is the **single source of truth** for the brand mark. Production builds reference derived assets shipped under `public/brand/` (`logo.svg`, `logo-512.png`, `logo-256.png`, `logo-on-dark.png`, `favicon.*`, `apple-touch-icon.png`); see `docs/graphics.md` §7.
- The logo must appear on:
  - The portal's top navigation bar.
  - The login page.
  - The browser favicon.
  - The End-of-Year Family Contribution Summary PDF (§4.6).
  - Transactional email headers.
- The visual system (color palette, typography, spacing, components, status chips, motion) follows `docs/graphics.md` and must be implemented as Tailwind theme tokens.
- Status states (`Pending`, `Approved`, `Rejected`, `Submitted`, `Overdue`, `Active`, `Inactive`) must always be communicated by **color + icon + label** — never by color alone.
- Every chart must include a textual or tabular fallback (see §4.6 and `docs/UX.md` §4.5).

### 4.10 Financial Secretary Signature Management
- The Financial Secretary must be able to **upload, replace, and remove** their official signature image via an admin-only profile setting.
- Signature image format: PNG with transparent background, ~180 px × ~60 px recommended.
- Storage: a **private Supabase Storage bucket**; access only through short-lived signed URLs requested at PDF render time.
- Audit: every upload/replace/remove is recorded in the audit log with actor and timestamp.
- Only the Financial Secretary (own signature) and the System Admin (any signature, for recovery) may manage the signature image.
- If no signature is on file, generation of the End-of-Year summary is blocked (§4.6).

### 4.11 System Administration & Operations
- The System Admin must have an **Admin Console** containing:
  - Users list with assigned roles, status, and last login.
  - Role assignment controls with a confirmation step when elevating privileges.
  - A **role-permission matrix** view that mirrors §7 of this PRD.
  - An **audit log** explorer with filters by user, entity, action, and date.
  - A **system health** page showing last deploy SHA, last backup date, recent client error count, and Supabase project status.
  - Category management (activate/deactivate, including the phase-out of the legacy $20/household category).
  - Sub-account management (CMO/CWO) and Group Financial Secretary assignment.
- All client-side runtime errors must be captured by a top-level React error boundary and written to a `client_errors` table (insert-only RLS for authenticated users; admin-only read).
- Runbooks for routine operations must be maintained under `docs/runbooks/` (e.g., `backup.md`, `add-user.md`, `deploy.md`, `monthly-checks.md`).

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | HTTPS only; Supabase Auth password hashing; **RBAC enforced server-side via Postgres RLS**; OWASP Top 10 mitigations; PII encrypted at rest; **TOTP 2FA — mandatory for System Admin, opt-in for other admin roles** (see §4.1); private Storage buckets with short-lived signed URLs for attachments and signature image; strict **Content Security Policy** delivered via `<meta>` tags in `index.html`; **Dependabot** + `npm audit` in CI. |
| **Privacy** | Members can only see their own family data; Finance Council sees **aggregates only**; only Chaplain, Financial Secretary, and Treasurer may view per-member data. No analytics in v1 to respect member privacy. Comply with reasonable data-protection norms; Diocese of San Jose imposes no known specific data-handling requirements at this time. |
| **Performance** | Pages load < 2s on broadband; dashboards render < 3s; **First Load JS < 250 KB gzipped**; tables/charts performant for ~50,000 transactions. Sized for ≈89 families today (≈100 member logins) growing to 500 families over time. |
| **Availability** | 99% uptime target. |
| **Accessibility** | **WCAG 2.1 AA** target. Color is never the only status signal. Every chart paired with textual/tabular fallback. Tap targets ≥ 44 × 44 px on mobile. Manual checks each release via Lighthouse + axe DevTools. |
| **Localization** | English (default) and Igbo (nice-to-have); i18n-ready via `react-i18next`; layouts tolerate ~30% string expansion (`docs/graphics.md` §12). |
| **Browser support** | Latest Chrome, Edge, Safari, Firefox; mobile responsive. |
| **Auditability** | All financial create/update/delete actions logged with user + timestamp via Postgres triggers writing to an append-only `audit_log` table. Money columns use `numeric(12,2)`; no hard deletes on financial rows (soft-delete via `is_active`). |
| **Observability** | No external monitoring service in v1. Client-side errors captured by a top-level React error boundary and inserted into a `client_errors` table. DB and Edge Function logs reviewed weekly via Supabase Logs. Internal `/admin/health` page summarizes deploy, backup, and error status. |
| **Data retention** | Keep at least **10 years** of contribution and expense records online and queryable. Older records may be archived but must remain restorable. |
| **Backups** | Supabase automated daily backups; plus a **monthly manual `pg_dump`** encrypted and stored in a private location. Retention 90 days minimum. Documented in `docs/runbooks/backup.md`. |
| **Maintenance** | Volunteer-friendly toolset: small dependency surface, no Docker required, single-command bootstrap, lint/typecheck/tests in CI only (no local Git hooks). See `docs/technology.md` §16. |

---

## 6. Technical Architecture (Selected)

> Full technology detail lives in `docs/technology.md`. This section summarizes the decisions that gate product requirements.

### 6.1 Hosting Decision
The site is hostable via GitHub. We have selected **Option B — static frontend on GitHub Pages + Supabase backend** (Postgres, Auth, Storage, Edge Functions, Row-Level Security). This offers the best balance of cost, security, and speed-to-build for a volunteer-run nonprofit.

| Option | Pros | Cons |
|---|---|---|
| **A. GitHub Pages (static) + serverless backend (e.g., Cloudflare Workers, Vercel, Supabase)** | Free static hosting, simple deploy | Backend hosted elsewhere; need separate auth/DB |
| **B. (Selected) Static frontend on GitHub Pages + Supabase backend** | Quick to build, generous free tier, built-in auth + DB + RLS, single backend service for a volunteer to operate | Supabase is the data home (mitigated: open-source, vanilla Postgres, exportable) |
| **C. Full-stack on Vercel/Render + repo on GitHub** | Easy CI/CD via GitHub; supports SSR | Not strictly “GitHub-hosted”; adds a server to operate |

### 6.2 Selected Stack (volunteer-friendly minimal toolbox)

**Frontend**
- React 18 + Vite 5 + **TypeScript** (strict).
- **Tailwind CSS** for styling.
- **shadcn/ui** components (copied into `src/components/ui`, no runtime library dependency) on Radix primitives — accessible by default.
- React Router 6 for routing.
- **React Hook Form + Zod** for forms and validation; Zod schemas are reused in Edge Functions.
- **Recharts** for charts (always paired with a textual/tabular fallback).
- `react-i18next` for English + Igbo.
- **jsPDF** for PDF exports; **PapaParse** for CSV import/export.
- Data access goes directly through the **Supabase JS client** wrapped in small custom hooks — no extra data-layer library.
- ESLint + Prettier; **Vitest** + React Testing Library for unit tests.
- Native `Intl.DateTimeFormat` for dates; no date library in v1.
- Plain HTML tables styled with Tailwind for ledgers; no table library in v1.

**Backend**
- **Supabase**: PostgreSQL 15+, Supabase Auth (email/password + magic link; **TOTP 2FA mandatory for System Admin, opt-in for other admin roles**), Supabase Storage (private buckets, signed URLs), Supabase Edge Functions (Deno/TypeScript), Row-Level Security as the authoritative authorization layer, `pg_cron` for scheduled jobs.
- **Email** in v1: Supabase built-in SMTP.

**Hosting / CI / Tooling**
- GitHub Pages for the SPA; Supabase for the backend.
- GitHub Actions for CI/CD (two workflows: `ci.yml` and `deploy.yml`).
- Local dev: **Node.js 20 LTS + npm only**; no Docker required; a hosted Supabase dev project replaces local Docker stacks.
- Dependabot enabled; `npm audit` in CI.

Deliberately excluded in v1 to keep the toolset maintainable for volunteers: TanStack Query, TanStack Table, Zustand/Redux, Playwright, Husky/lint-staged, Sentry, Storybook, jspdf-autotable, SheetJS, date-fns, axe-core in CI, CodeQL.

### 6.3 High-Level Data Model (Draft)
- `users` (id, email, role, member_id FK, **fin_sec_signature_path** [nullable, path to private Storage object — only populated for the Financial Secretary])
- `members` (id, **member_number** [unique sequential int, starting from existing 1–78], first_name, last_name, email, phone, address, status, joined_date, household_id, role_in_household [head|spouse|child])
- `households` (id, name, primary_member_id)
- `contributions` (id, member_id, household_id, date, amount, category_id, payment_method, notes, created_by, created_at)
- `categories` (id, name, type [income|expense], is_active [bool], parent_id [nullable, for donation sub-categories])
- `sub_accounts` (id, code [CMO|CWO], name, is_active, current_balance)
- `sub_account_users` (id, user_id, sub_account_id, role [group_fin_sec])
- `sub_account_transactions` (id, sub_account_id, date, type [income|expense], amount, category_id, payment_method, payee, notes, attachment_url, created_by, created_at)
- `sub_account_reports` (id, sub_account_id, period_start, period_end, opening_balance, total_income, total_expense, closing_balance, submitted_by, submitted_at) — immutable once submitted
- `expenses` (id, date, amount, category_id, payee, description, status [pending|approved|rejected], submitted_by, approved_by [Chaplain], approval_timestamp, rejection_reason, created_by)
- `expense_notifications` (id, expense_id, notified_user_id, notified_at) — tracks Finance Council notifications
- `audit_log` (id, user_id, action, entity, entity_id, before, after, timestamp) — append-only
- `client_errors` (id, user_id [nullable], path, message, stack [truncated], user_agent, occurred_at) — insert-only RLS for authenticated users; admin-only read

**Conventions:** all money columns `numeric(12,2)`; all timestamps `timestamptz` default `now()`; `created_by`/`updated_by` set via triggers from `auth.uid()`; no hard deletes on financial rows.

### 6.4 Server-Side Edge Functions
These flows must run server-side (cannot be safely done from the SPA):
- `submit-expense` — creates an expense, fans out notifications to Finance Council and Chaplain.
- `approve-expense` / `reject-expense` — server-validated status transitions; writes audit entries.
- `submit-sub-account-report` — closes a monthly period for CMO or CWO and writes an immutable snapshot.
- `generate-annual-summary` — produces the End-of-Year Family Contribution Summary PDF with the official logo and the Financial Secretary's signature. Returns an error if no signature is on file.
- `send-reminders` — runs from `pg_cron`; sends dues reminders and monthly summary nudges.
All Edge Functions verify the caller's JWT and role, re-validate inputs with Zod, and write to `audit_log`.

### 6.5 Environments & CI/CD
- **Environments:** `dev` (hosted Supabase dev project + local Vite) and `prod` (main Supabase project + GitHub Pages). A separate `staging` is deferred until there are multiple regular contributors.
- **CI (`ci.yml`, on every PR):** install → lint → typecheck → unit tests → build.
- **CD (`deploy.yml`, on merge to `main`):** build SPA → deploy to GitHub Pages. Database migrations are applied manually by the admin via `supabase db push` in v1.
- **Secrets** are stored as GitHub Actions encrypted secrets; nothing sensitive ships in the SPA bundle beyond the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 6.6 Brand & Design Tokens
The visual system is defined in `docs/graphics.md` and must be implemented as Tailwind theme tokens. Summary of non-negotiables:
- Primary brand color `brand-900 #0B2B5C`; gold accent `accent-600 #B98A2C` reserved for key totals.
- Typography: **Source Serif 4** (headings) + **Inter** (UI, with tabular figures for money).
- Icons: `lucide-react` only.
- The official logo (`logo.jpg` and derivatives in `public/brand/`) appears in the top bar, login page, favicon, End-of-Year summary PDF, and email headers.
- All status states render as **chip = icon + label + colored background** (never color alone).

---

## 7. Roles & Permissions Matrix

| Action | Member | Fin. Secretary | Treasurer | Group Fin. Sec (CMO/CWO) | Chaplain | Finance Council | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own/family contributions | ✅ | ✅ | ✅ | ✅ (if member) | ✅ | ✅ | ✅ |
| Download own family annual tax summary | ✅ | ✅ | ✅ | ✅ (own family only) | ✅ | ❌ | ✅ |
| View any member profile | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Create/edit member | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Record contribution (main ledger) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Record sub-account income/expense (assigned group only) | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| View other group's sub-account details | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ (aggregate only) | ✅ |
| Submit monthly sub-account summary report | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Submit expense | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Approve / reject expense** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Notified of expenses | ❌ | ✅ | ✅ | Optional | ✅ | ✅ | ✅ |
| View aggregate financial dashboard | ❌ | ✅ | ✅ | ✅ (own sub-account page) | ✅ | ✅ | ✅ |
| View per-member financial details | ❌ | ✅ | ✅ | ❌ | ✅ | **❌** | ✅ |
| Generate per-family tax summary (any family) | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Upload / replace own Fin. Sec. signature image** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (any signature, for recovery) |
| **Generate End-of-Year summary (requires FS signature on file)** | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | ❌ | Optional | ❌ | ✅ |
| View system health page (`/admin/health`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage categories (incl. legacy phase-out) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage sub-accounts and Group Fin. Sec. assignment | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage user roles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export reports | ❌ | ✅ | ✅ | ✅ (own group only) | ✅ | ✅ (aggregates) | ✅ |

> **Note:** Finance Council is intentionally restricted to **aggregate** financial views. Per-member drill-down is reserved for the Chaplain, Financial Secretary, and Treasurer.

---

## 8. Milestones (Proposed)

| Phase | Scope |
|---|---|
| **M0 — Setup** | GitHub repo, two GitHub Actions workflows (`ci.yml`, `deploy.yml`), Supabase dev + prod projects, base UI shell with logo + design tokens, auth (email/password + magic link), error boundary writing to `client_errors`. |
| **M1 — Member portal** | Member CRUD (admin), CSV import for the existing 78 members / 89 families, member self-service profile, login (email or member number). |
| **M2 — Contributions** | Record contributions, member contribution history view, audit log triggers. |
| **M3 — Treasurer & Approvals** | Expenses, balances, basic reports, expense submission/approval/rejection Edge Functions, Finance Council expense notifications. |
| **M4 — Sub-Accounts & Reporting** | CMO/CWO sub-account pages, monthly summary submission Edge Function, Finance Council aggregate dashboard. |
| **M5 — Signature + End-of-Year Summary** | Financial Secretary signature upload UI, private Storage bucket, `generate-annual-summary` Edge Function with logo + signature, generation-gate when no signature is on file. |
| **M6 — Hardening** | RLS policy tests, audit log explorer, `/admin/health` page, accessibility pass (Lighthouse + axe DevTools), security review, runbooks under `docs/runbooks/`. |
| **M7 — v1 Launch** | Data migration, training, go-live. |

---

## 9. Resolved Questions (was: Open Questions)

| # | Question | Decision |
|---|---|---|
| 1 | How are member numbers currently assigned (format, sequence)? | **Sequential integer serial numbers.** Current range is 1–78. System auto-assigns the next available number; admin manual override allowed. |
| 2 | What contribution categories does NICC-SJ track today? | **CMO Dues, CWO Dues, Harvest (biennial), Building Fund, Donations (ad-hoc sub-categories), Offertory.** Plus legacy $20 household annual dues (being phased out). |
| 3 | What are the current annual dues amounts? Per-individual or per-household? | Legacy **$20/household annual dues** is being **phased out**. CMO/CWO dues are tracked per individual member; new dues structure TBD by the council. |
| 4 | How many active members today (for sizing)? | **≈89 families.** Design for growth to ~500 families. |
| 5 | Should the system support multiple languages (English / Igbo)? | **Yes, if feasible.** Build i18n-ready; ship English first, Igbo as a nice-to-have. |
| 6 | Will members pay online in v1? | **No.** Strictly a record-keeping tool. No payment gateway integration in v1 (or v2 unless council later decides). |
| 7 | Who owns approval of expenses? | **Chaplain** is the ultimate approver. **Finance Council is notified/aware** of expenses but does not vote. Treasurer submits. |
| 8 | Data retention policy? | Keep **at least 10 years** of records online. |
| 9 | Does the Diocese of San Jose impose data-handling requirements? | **None known** at this time. Revisit if guidance is later issued. |
| 10 | Should Finance Council see per-member data or aggregates only? | **Aggregates only.** Per-member detail is restricted to Chaplain, Financial Secretary, and Treasurer. |

### 9.1 Newly Identified Requirements
- **Annual / End-of-Year Family Tax Summary:** For each family, the system must generate a per-calendar-year PDF of total dues and total donations. The PDF must include the **official organization logo** and the **Financial Secretary's signature block** (image + printed name + title + date). The system must **block generation** if no Financial Secretary signature image is on file. (See §4.6, §4.10, and `docs/graphics.md` §11.)
- **CMO/CWO Sub-Account Manager Page:** CMO and CWO must each have a designated Group Financial Secretary account that can manage only that group's incoming and outgoing funds on a dedicated page and submit periodic reports to the Financial Secretary and Finance Council. (See §4.5 and §4.6.)
- **Official logo (`logo.jpg`) integration:** The supplied logo is the single source of truth and must appear in top nav, login, favicon, End-of-Year summary PDF, and email headers. Derivative assets live under `public/brand/`. (See §4.9.)
- **System Admin tooling:** Admin Console with users, role-permission matrix view, audit log explorer, system health page, and category/sub-account management. (See §4.11.)
- **Volunteer-friendly tech stance:** A deliberately small toolset (React + Vite + TypeScript + Tailwind + shadcn/ui + minimal libraries), Node 20 LTS + npm only for local dev, two CI workflows, no external monitoring service in v1. (See §6.2, §6.5.)

### 9.2 Remaining Open Questions
1. What is the **replacement dues structure** that will succeed the $20/household legacy dues? (Confirm CMO/CWO dues amounts and any new household-level levy.)
2. Who specifically holds the **Chaplain** account, and what is the backup approver if the Chaplain is unavailable?
3. Should the Finance Council notification for expenses be **per-expense** or a **daily/weekly digest**?
4. Is there an existing **digital member roster** (spreadsheet) to import for the initial 78 members and 89 families?
5. For the Igbo localization — is there a preferred orthography / source of translated liturgical/finance terminology?
6. Confirm the exact **printed name and title** to render under the Financial Secretary signature on End-of-Year summaries.
7. ~~Is a **vector** version of the logo available, or should we trace `logo.jpg` into `logo.svg` ourselves?~~ **Resolved 2026-06-15 (AR-4):** trace `logo.jpg` into `logo.svg`; vector master may replace later.
8. ~~**2FA policy** for admin roles — mandatory or opt-in in v1?~~ **Resolved 2026-06-15 (AR-6):** Hybrid — mandatory for System Admin, opt-in for other admin roles. See §4.1.
9. Should the End-of-Year summary include an optional **verification hash** (last 8 chars of SHA-256 of the payload) in v1, or defer to v1.5?
10. ~~Acquire a **custom domain** (e.g., `portal.niccsj.org`)? Affects CSP/security headers and email DMARC.~~ **Resolved 2026-06-15 (AR-3):** deferred to post-v1; site runs on default GitHub Pages URL through v1.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Sensitive PII / financial data leak | RLS, HTTPS, encryption, audit log, least-privilege roles, private Storage with signed URLs. |
| Volunteer turnover (admins leave) | Documented runbooks in `docs/runbooks/`, multi-admin policy, IaC-style SQL migrations in repo. |
| Hosting cost creep | Stay on free tiers; Supabase + GitHub Pages free tiers sufficient for current size. |
| Adoption resistance | Train Financial Secretary / Treasurer; preserve familiar workflows; CSV import from existing records. |
| Data loss | Supabase daily backups + monthly encrypted `pg_dump`; point-in-time recovery on Supabase. |
| **End-of-Year summary issued without authority** | System blocks PDF generation when no Financial Secretary signature is on file (§4.6, §4.10). |
| **Logo / brand asset drift** | `logo.jpg` is the single source of truth at the repo root; derivative assets are committed under `public/brand/` and reviewed at each release. |
| **Vendor lock-in to Supabase** | Supabase is open-source on vanilla Postgres; data is exportable; architecture allows future migration. |
| **RLS misconfiguration** | RLS policy tests in CI (pgTAP) before production deploys; staging or hand-test sign-off prior to each release. |
| **GitHub Pages cannot set HTTP headers** | Strict CSP via `<meta>` tags; consider Cloudflare in front of a custom domain to add real headers. |

---

## 11. Success Metrics
- 100% of active members onboarded within 3 months of launch.
- ≥80% of members log in at least once per quarter.
- Treasurer/Sec time-to-record a contribution < 30 seconds.
- Monthly financial report generated in < 5 minutes (vs. hours manually).
- 100% of issued End-of-Year summaries carry the official logo and a current Financial Secretary signature.
- Lighthouse accessibility score ≥ 90 on key pages (login, member dashboard, treasurer dashboard, chaplain approval queue, sub-account manager).
- Zero security incidents in first 12 months.

---

## 12. Appendix
- Companion specifications:
  - [`docs/UX.md`](UX.md) — role-based experience, IA, end-to-end flows, content/tone, accessibility patterns.
  - [`docs/technology.md`](technology.md) — stack, hosting, environments, CI/CD, security, observability, exports, local dev.
  - [`docs/graphics.md`](graphics.md) — visual identity, logo usage, design tokens, components, End-of-Year summary PDF layout, signature requirement.
- Glossary, mockups, runbooks, and API contracts to be added in subsequent revisions.
