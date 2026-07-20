# Technology Specification

## Project: NICC-SJ Finance & Membership Portal

**Organization:** Nigerian Igbo Catholic Community of San Jose, CA (NICC-SJ)
**Document Version:** 0.2 (Draft — simplified for volunteer maintenance)
**Last Updated:** June 7, 2026
**Source of Truth:** `docs/PRD.md`, `docs/UX.md`
**Purpose:** Define the end-to-end technology stack, hosting, architecture, security, integrations, and operational tooling that will deliver the portal described in the PRD and UX docs.

> **Maintenance philosophy:** This is a volunteer-run nonprofit. We deliberately keep the toolset small. Every dependency on this page must be (a) widely used, (b) well documented, and (c) something a future volunteer can pick up with public tutorials. When in doubt, **choose the simpler option**.

---

## 1. Guiding Principles

1. **Nonprofit-grade economics.** Prefer free / generous-free-tier services. Avoid lock-in where reasonable.
2. **GitHub-centric.** Source of truth is GitHub; deploys run from GitHub Actions; production frontend served by GitHub Pages (per PRD §6.1).
3. **Security and privacy first.** Server-enforced RBAC, encrypted secrets, encrypted PII at rest, OWASP Top 10 mitigations.
4. **Boring, proven tech.** No experimental frameworks. Long-support stacks the volunteer admin can maintain.
5. **Small toolbox.** Fewer dependencies = fewer things that break. Add a tool only when a real problem requires it.
6. **TypeScript everywhere.** Strong types reduce defects in financial code.
7. **Auditability over cleverness.** Every financial mutation produces an audit log entry.
8. **Static frontend, managed backend.** Minimize servers the volunteer admin must operate.

---

## 2. High-Level Architecture

```
[ Browser (React SPA, GitHub Pages CDN) ]
              │  HTTPS
              ▼
[ Supabase Edge Functions (Deno/TS) ]  ←──── audit, business rules, server-only logic
              │
              ▼
[ Supabase Postgres + Row-Level Security ] ←─ source of truth for all data
              │
              ▼
[ Supabase Storage (receipts/attachments) ]   [ Supabase Auth (email/password + magic link) ]

Side services:
- Supabase built-in SMTP (or Resend) for transactional email
- GitHub Actions for CI/CD
- Supabase Logs for errors and DB activity (no separate monitoring service in v1)
```

**Pattern:** Static SPA on GitHub Pages + Supabase as the backend-as-a-service (Postgres, Auth, Storage, Edge Functions, RLS). This is **Option B** in PRD §6.1, which is the recommended path.

---

## 3. Frontend Stack (Minimal)

The frontend is intentionally lean. Only the tools below are required.

| Concern | Choice | Why this one |
|---|---|---|
| Framework | **React 18** | Most-used UI framework; abundant tutorials and volunteers familiar with it. |
| Build tool | **Vite 5+** | One config, fast dev server, builds a static site that drops onto GitHub Pages. |
| Language | **TypeScript 5.x** (strict) | Catches bugs in financial code at compile time. |
| Styling | **Tailwind CSS 3.x** | Style with utility classes; no CSS files to maintain. |
| UI components | **shadcn/ui** (copies components into `src/components/ui` — no runtime dependency) | Accessible components we own; no library upgrade churn. |
| Icons | **lucide-react** | Single small icon package. |
| Routing | **React Router 6** | Standard SPA routing. |
| Data access | **Supabase JS client** directly, wrapped in small custom hooks | No extra data-layer library. The Supabase client already handles fetching, caching can be done with `useState`/`useEffect`. |
| Forms | **React Hook Form** + **Zod** | One small library + schema validation. Replaces a lot of hand-written form code. |
| Tables | **Plain HTML tables** styled with Tailwind | Our data sets are small (PRD §5). No table library needed. Add pagination/filtering with simple state when required. |
| Charts | **Recharts** | Simple declarative charts (per PRD §6.2). |
| Dates | Native `Intl.DateTimeFormat` + small helper | Avoid pulling in a date library. Add `date-fns` only if real pain appears. |
| i18n | **react-i18next** | English now, Igbo later (PRD §4.8). |
| PDF export | **jsPDF** | Client-side PDFs for tax summaries and reports. |
| CSV export/import | **PapaParse** | One tiny library, used for CSV migration import and exports. |
| Lint / format | **ESLint** + **Prettier** | Run via `npm run lint` and in CI. |
| Tests | **Vitest** + **React Testing Library** | One test runner, fast. |
| A11y tests | **axe-core** | Automated WCAG A/AA checks over key pages (Sprint 9 §9.8); dev-only, no runtime cost. |

### 3.1 What we explicitly chose NOT to use (and why)
- **TanStack Query / React Query** — overkill for our data volume; the Supabase client + simple hooks are enough.
- **TanStack Table** — our largest tables fit in memory; HTML + Tailwind is fine.
- **Zustand / Redux** — React Context is sufficient for the few global pieces (auth user, language).
- **Playwright / E2E framework** — postpone until v1.5. Manual smoke tests + unit tests cover v1.
- **Storybook** — not needed at this size.
- **Husky / lint-staged** — keep checks in CI only; no local Git hooks to break new contributors.
- **Sentry / external error monitoring** — Supabase Logs + browser console + GitHub Issues are enough for v1.

### 3.2 Frontend Conventions
- Folder structure (flat and obvious):
  ```
  src/
    components/      # shared UI components
    components/ui/   # shadcn/ui primitives
    pages/           # one folder per route
    lib/             # supabase client, helpers
    hooks/           # small custom hooks (e.g., useMembers, useExpenses)
    i18n/            # en, ig translations
    types/           # shared TS types
  ```
- All API access goes through a single typed Supabase client wrapper in `src/lib/supabase.ts`.
- All forms use Zod schemas; the same schemas are reused in Edge Functions.
- TS config: `strict: true`. Skip `noUncheckedIndexedAccess` if it slows volunteers down.
- No secrets in the bundle. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are shipped (public by design).

---

## 4. Backend Stack

| Concern | Choice | Rationale |
|---|---|---|
| Platform | **Supabase** (Postgres + Auth + Storage + Edge Functions + RLS) | One managed service, generous free tier, open-source core. |
| Database | **PostgreSQL 15+** (managed by Supabase) | Mature, relational, ideal for ledger-style data. |
| Auth | **Supabase Auth** — email/password + magic link | Per PRD §6.2. 2FA available for admin roles. |
| Authorization | **Postgres Row-Level Security (RLS)** policies | Authoritative permission enforcement. |
| Server logic | **Supabase Edge Functions (Deno + TypeScript)** | For workflows the SPA cannot safely do alone (notifications, report generation, audit-sensitive operations, sub-account submission). |
| File storage | **Supabase Storage** | Expense receipts and attachments; signed URLs. |
| Email | **Supabase built-in SMTP** in v1 (Resend later if volume grows) | One less service to set up and pay for. |
| Migrations | **Supabase CLI** (SQL migrations in repo) | Version-controlled schema. |
| Local dev | **Supabase CLI + Docker** | Full local stack for development. |
| Background jobs | **pg_cron** + Edge Functions | Daily reminders, monthly summary nudges. |

### 4.1 Why not a custom Node/Express backend?
- Adds a server the volunteer admin must operate, monitor, and patch.
- Supabase + RLS provides the same guarantees with fewer moving parts.
- Edge Functions cover the few server-only flows we need.

---

## 5. Data Model (Authoritative)

The data model is defined in PRD §6.3. All tables live in the Supabase `public` schema with RLS enabled by default:

- `users` — extends `auth.users`; carries app role and `member_id`.
- `members`, `households`
- `contributions`, `categories`
- `sub_accounts`, `sub_account_users`, `sub_account_transactions`, `sub_account_reports`
- `expenses`, `expense_notifications`
- `audit_log`

### 5.1 Conventions
- All money columns: `numeric(12,2)` (NEVER float).
- All timestamps: `timestamptz`, default `now()`.
- All inserts/updates set `created_by` / `updated_by` from `auth.uid()` via triggers.
- Soft-delete via `is_active` flags where appropriate; no hard deletes on financial rows.
- Categories support `parent_id` for ad-hoc donation sub-categories (PRD §4.3).

### 5.2 Audit Strategy
- A trigger on every financial table writes to `audit_log` with `before`/`after` JSON and `auth.uid()`.
- `audit_log` is append-only; RLS allows only Admin (and optionally Chaplain) to read.

---

## 6. Authentication & Authorization

### 6.1 Authentication
- Supabase Auth — email/password (with optional member number as username via custom login that resolves member_number → email server-side).
- Password reset via email magic link.
- Optional **TOTP 2FA** for Admin, Treasurer, Financial Secretary, Chaplain (Supabase Auth MFA).
- Session via secure httpOnly cookies (Supabase JS v2 default) or local storage with short-lived JWT + refresh.

### 6.2 Authorization (RBAC + RLS)
- App roles (stored in `users.role`): `member`, `fin_secretary`, `treasurer`, `group_fin_sec`, `chaplain`, `finance_council`, `admin`.
- A Postgres function `auth.app_role()` returns the caller's role.
- RLS policies are written per table per role, matching PRD §7 permission matrix exactly.
- Example policies (illustrative):
  - `members`: a member can `SELECT` only their own household; `fin_secretary`/`chaplain`/`admin` can `SELECT` all.
  - `sub_account_transactions`: `group_fin_sec` can `INSERT/SELECT/UPDATE` only rows where `sub_account_id` matches an entry in `sub_account_users` for the caller.
  - `expenses`: only `chaplain` (or `admin`) may update `status` from `pending` to `approved`/`rejected`; enforced via RLS + a `before update` trigger.
- **No business permission logic lives only in the SPA.** RLS is the source of truth.

---

## 7. API Layer

We do not build a REST/GraphQL layer of our own. Instead:

- **Supabase auto-generated PostgREST API** for standard CRUD (guarded by RLS).
- **Supabase Edge Functions** for:
  - `submit-expense` — creates expense, fans out notifications to Finance Council and Chaplain.
  - `approve-expense` / `reject-expense` — server-validated state transitions and audit entries.
  - `submit-sub-account-report` — closes a monthly period, computes opening/in/out/closing snapshot, makes it immutable.
  - `generate-annual-summary` — produces PDF for a household-year (alternative to client-side jsPDF when consistency matters).
  - `send-reminders` — runs from `pg_cron`; sends due-dues and monthly summary reminders.

All Edge Functions:
- Verify the caller's JWT and role.
- Re-validate inputs with Zod (shared with frontend).
- Write to `audit_log`.

---

## 8. Hosting & Deployment

### 8.1 Hosting Targets
| Layer | Where | Notes |
|---|---|---|
| Frontend SPA | **GitHub Pages** (project pages, custom domain optional) | Per PRD §6.1. |
| Backend (DB/Auth/Storage/Functions) | **Supabase** (hosted) | Free tier sufficient for size in PRD §5. |
| Email | **Resend** (free tier) | Transactional only. |
| DNS | **Cloudflare** (free) | If a custom domain (e.g., `portal.niccsj.org`) is acquired. |

### 8.2 CI/CD (GitHub Actions) — Two Simple Workflows
We keep CI/CD minimal: two workflow files, easy to read.

- **`ci.yml` (on every PR):** install → lint → typecheck → unit tests → build.
- **`deploy.yml` (on merge to `main`):** build SPA → deploy to GitHub Pages. Database migrations are applied manually by the admin via `supabase db push` from their machine for v1 (no automated DB deploys).

No preview deploys, no E2E in CI, no Playwright in v1.

Secrets stored in **GitHub Actions Encrypted Secrets** (never in repo):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Migration secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) live on the admin's machine, not in CI, until we have multiple maintainers.

### 8.3 Environments
- **dev** — a dedicated Supabase **dev project** (cloud) + local Vite dev server. (No Docker required.)
- **prod** — main Supabase project, deployed to the root of GitHub Pages.

A separate **staging** environment is intentionally deferred. We add it only if/when we have multiple regular contributors.

---

## 9. Security

Aligned with PRD §5 non-functional requirements.

- **HTTPS everywhere.** GitHub Pages and Supabase enforce TLS.
- **OWASP Top 10 mitigations:**
  - Injection: parameterized queries (Supabase JS / SQL only).
  - Broken access control: RLS as the only source of truth.
  - Sensitive data exposure: PII columns encrypted at rest (Supabase default + `pgcrypto` for sensitive fields if needed).
  - Misconfiguration: infra-as-code (SQL migrations + Supabase config in repo).
  - XSS: React escapes by default; sanitize any HTML via DOMPurify if rich text is ever introduced.
  - CSRF: SPA + Bearer JWT, SameSite cookies; no cross-site form posts.
- **Secrets management:** GitHub Actions Encrypted Secrets + Supabase project secrets. Nothing sensitive in the SPA bundle beyond the public anon key.
- **Audit log:** every financial mutation. Append-only.
- **2FA:** TOTP for all admin-level roles (Admin, Treasurer, Financial Secretary, Chaplain, Group Financial Secretary).
- **Account lockout / rate limiting:** Supabase Auth defaults + Edge Function rate limiting for sensitive endpoints.
- **Backups:** Supabase daily automated backups (retained per Supabase plan); the admin runs a manual `pg_dump` once a month and stores the encrypted file in a private location to meet PRD §5 backup retention. Document this in `docs/runbooks/backup.md`.
- **Dependency hygiene:** **Dependabot** turned on for npm and GitHub Actions; `npm audit` runs in CI. (CodeQL can be enabled later if/when we have time to triage findings.)
- **Content Security Policy:** strict CSP via `<meta>` tags in `index.html` (GitHub Pages cannot set HTTP headers without a custom domain + Cloudflare).
- **Receipts/attachments:** stored in private Supabase Storage buckets; access only via short-lived signed URLs.

---

## 10. Observability (Minimal)

We deliberately avoid running an external monitoring service in v1.

- **Errors (frontend):** caught by a top-level React error boundary that shows a friendly message and writes the error to a `client_errors` table via the Supabase client (the table has insert-only RLS for any authenticated user; admin can read it).
- **Errors (backend):** **Supabase Logs** for DB and Edge Functions; review weekly.
- **Health page:** internal `/admin/health` route showing last deploy SHA, last backup date, recent error count from `client_errors`, and Supabase project status.
- **Analytics:** none in v1. Member privacy is more important than usage stats. Revisit later with a privacy-respecting option (e.g., Plausible) if the council asks for it.

---

## 11. Internationalization (i18n)

- **react-i18next** with JSON resource files under `src/i18n/{en,ig}/`.
- All user-facing strings externalized from day one (PRD §4.8).
- English ships in v1; Igbo as a nice-to-have, contributed by the community.
- Locale selector in the top bar (PRD UX §4.1).

---

## 12. Accessibility

- WCAG 2.1 AA target (PRD §5).
- Build on **shadcn/ui** components, which use Radix primitives — keyboard navigation and ARIA come built-in.
- Manual checks before each release using **Lighthouse** (built into Chrome DevTools) and the free **axe DevTools** browser extension. No automated a11y in CI for v1.
- Tailwind theme picks color tokens that meet contrast targets.
- Every chart is paired with a textual or tabular fallback (UX §4.5).

---

## 13. Reporting & Exports

Keep exports to two simple formats: **PDF** for human-readable statements and **CSV** for everything else (CSV opens cleanly in Excel and Google Sheets).

| Export | Tech | Where it runs |
|---|---|---|
| Annual Family Contribution Summary | **jsPDF** | Client-side |
| Ledger / report data exports | **PapaParse** (CSV) | Client-side |
| Monthly / quarterly / annual reports | **jsPDF** for PDF view; **CSV** for raw data | Client-side |
| Sub-Account monthly snapshot (immutable) | Edge Function writes a row + generates PDF | Server-side |

We explicitly **do not** ship a native Excel (.xlsx) export library in v1. CSV is universally understood and avoids another dependency.

---

## 14. Data Migration (Initial Load)

- **CSV import** for the existing 78 members and 89 families (PRD §4.2).
- Importer is an authenticated admin-only page that streams rows, validates with Zod, and writes via a dedicated Edge Function with full audit entries.
- Member numbers preserved from the existing 1–78 range; sequence continues from the max.

---

## 15. Performance Budget

Aligned with PRD §5:
- First Load JS: < 250 KB gzipped for the SPA shell.
- Initial render TTI: < 2s on broadband.
- Dashboard render with charts: < 3s.
- Sized for 89 → 500 families, ~50,000 transactions.
- Indexed columns: `contributions.household_id`, `contributions.member_id`, `contributions.date`, `sub_account_transactions.sub_account_id+date`, `expenses.status+created_at`.

---

## 16. Local Developer Experience (Volunteer-Friendly)

Goal: a new volunteer can be running the app in under 15 minutes with tools they already know.

- **Required tools:** **Node.js 20 LTS** and **npm** only.
- **Optional tool:** **Supabase CLI** (only needed if a volunteer is editing SQL migrations; not required to run the app against the dev database).
- **No Docker required.** We use a hosted Supabase **dev project** in the cloud for development.
- **Bootstrap:**
  ```
  git clone <repo>
  cd nicc-sj-portal
  npm install
  cp .env.example .env.local   # admin shares dev URL + anon key
  npm run dev
  ```
- `.env.example` checked in; real secrets never committed.
- No pre-commit hooks. Linting runs in CI only; volunteers can run `npm run lint` locally if they want.
- Commit message style: free-form, just be descriptive.

---

## 17. Repository Layout (Proposed)

```
/
├─ .github/workflows/           # CI/CD pipelines
├─ docs/                        # PRD.md, UX.md, technology.md
├─ supabase/
│  ├─ migrations/               # SQL migrations
│  ├─ functions/                # Edge Functions (Deno/TS)
│  └─ seed.sql                  # initial seed (categories, sub-accounts)
├─ src/
│  ├─ app/                      # app shell, providers, router
│  ├─ pages/                    # route-level pages
│  ├─ features/                 # members, contributions, expenses, sub-accounts, reports
│  ├─ components/               # shared UI components
│  ├─ lib/                      # supabase client, auth, utils
│  ├─ hooks/
│  ├─ i18n/
│  └─ types/
├─ tests/                       # Vitest + Playwright
├─ public/
├─ index.html
├─ vite.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

## 18. Risks & Mitigations (Tech-Specific)

| Risk | Mitigation |
|---|---|
| Vendor lock-in to Supabase | Supabase is open-source; data lives in vanilla Postgres; we can self-host or migrate if needed. |
| GitHub Pages cannot set HTTP security headers | Use strict `<meta>` CSP; consider Cloudflare in front of a custom domain to add real headers. |
| Volunteer admin turnover | Documented runbooks in `/docs/runbooks/`; multi-admin policy; IaC-style SQL migrations. |
| Free-tier limits exceeded as community grows | Monitor Supabase usage; upgrade plan is modest cost; architecture allows scaling without rewrite. |
| Client-side PDF inconsistency | Pin jsPDF version; snapshot-test rendered PDFs in CI. |
| RLS misconfiguration | RLS policy unit tests via **pgTAP** in CI; staging env mirrors prod. |
| Email deliverability | Use Resend with SPF/DKIM/DMARC on the custom domain. |

---

## 19. Tech Decisions Pending Confirmation

1. **Custom domain** (e.g., `portal.niccsj.org`) — yes/no? Affects CSP/security headers and email DMARC setup.
2. **2FA** for admin roles — mandatory or opt-in for v1?
3. **Email provider** — keep Supabase built-in SMTP for v1 and revisit only if deliverability becomes a problem.
4. **PDF generation location** — keep everything client-side (jsPDF), or move tax summaries to an Edge Function for byte-for-byte consistency?
5. **Audit log retention** — full 10 years online (PRD §5), or archive older rows after N years?

---

## 20. Next Technology Deliverables

- Initial Supabase SQL migration set implementing the PRD §6.3 schema with RLS policies.
- Two GitHub Actions workflow files: `ci.yml` and `deploy.yml`.
- `vite.config.ts` configured for the GitHub Pages base path.
- shadcn/ui base components installed in `src/components/ui` aligned with UX §4.2 design system.
- Edge Function scaffolds for: `submit-expense`, `approve-expense`, `reject-expense`, `submit-sub-account-report`, `send-reminders`.
- `README.md` with the bootstrap steps in §16 and a short contribution guide.
- A `docs/runbooks/` folder with: `backup.md`, `add-user.md`, `deploy.md`, `monthly-checks.md` — written for a non-technical volunteer admin.
