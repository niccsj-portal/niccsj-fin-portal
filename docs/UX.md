# User Experience Specification (UX)

## Project: NICC-SJ Finance & Membership Portal

**Organization:** Nigerian Igbo Catholic Community of San Jose, CA (NICC-SJ)
**UX Document Version:** 0.1 (Draft — for review)
**Last Updated:** June 7, 2026
**Source of Truth:** `docs/PRD.md`
**Purpose:** Define the expected end-user experience for every role of the portal — what each person should see, what they should be able to do, and what they should expect from the product.

---

## 1. UX Vision

The portal should feel:

- **Trustworthy.** Financial records are clear, consistent, and auditable.
- **Simple.** Common tasks (record contribution, approve expense, export report, download annual summary) take very few clicks.
- **Respectful of privacy.** People only see what their role entitles them to see — nothing more.
- **Inclusive.** Plain language, mobile-friendly, accessible, and (eventually) bilingual (English + Igbo).
- **Community-oriented.** Reflects the stewardship culture of a Catholic, faith-based, volunteer-run nonprofit.

---

## 2. UX Principles

1. **Role-first design.** The dashboard and navigation adapt to the user’s role immediately after login.
2. **Action clarity.** Every financial action carries a clear status, owner, and timestamp.
3. **Least privilege by default.** Data a role shouldn’t see is hidden, not just disabled.
4. **Fast data entry.** Finance roles can complete common entries in under 30 seconds.
5. **Safe correction path.** Edits are possible, but always visible in audit history.
6. **System state is explicit.** Pending / Approved / Rejected / Submitted / Overdue are visible at all times.
7. **Readable reporting.** Charts are always paired with totals and downloadable exports.
8. **Forgiving UI.** Confirm destructive actions; explain errors in human language.

---

## 3. Primary User Groups

- Member (family/household)
- Financial Secretary
- Treasurer
- Group Financial Secretary (CMO / CWO sub-account manager)
- Chaplain
- Finance Council
- System Admin (Tech Owner)

---

## 4. Global Experience (All Roles)

### 4.1 Navigation Shell
- **Top bar:** organization name/logo, role badge, language selector (English default; Igbo when available), profile menu, log out.
- **Left navigation:** only the menu items relevant to that role.
- **Persistent quick actions** for admin roles (e.g., “Add Contribution”, “Add Expense”, “Export”).

### 4.2 Design System Expectations
- Consistent **status chips**: `Pending`, `Approved`, `Rejected`, `Submitted`, `Overdue`, `Active`, `Inactive`.
- Standard **summary cards**: Total Income, Total Expense, Net Balance, Transactions.
- Reusable **filters**: date range, category, transaction type, household/member (where the role permits).
- **Responsive** behavior: stacked cards on mobile, horizontally-scrollable tables/charts where needed.

### 4.3 Data Trust & Feedback
- Every save returns an immediate, visible confirmation (toast or inline).
- Every destructive action requires confirmation.
- Every editable transaction shows “last edited by” and timestamp.
- Empty states always include the **next best action** (e.g., “No transactions yet — Add first income entry”).

### 4.4 Security UX
- Role-restricted pages show a friendly “You don’t have access to this page” instead of generic errors.
- Sensitive views auto-hide PII unless the role permits viewing.
- Session timeout warning appears before forced logout.
- Login supports email **or** member number per PRD §4.1.

### 4.5 Accessibility (WCAG 2.1 AA target)
- Full keyboard navigation.
- Color is never the only signal — pair color with icon and label.
- Every chart has a textual/tabular fallback.
- Touch-friendly controls for mobile users (especially older members).

---

## 5. Role-Based Experience

> Each role below answers the same three questions: **What should they see?**, **What should they be able to do?**, **What should they expect?**

---

### 5.1 Member (Family / Household)

**Context:** Likely the largest user group. Many will be older adults using a phone. They want simple, reassuring access to their family’s giving history.

**What they should see (after login):**
- A friendly welcome with their name and household.
- A **“This Year at a Glance” card**: total contributed YTD with a small category breakdown (CMO Dues, CWO Dues, Harvest, Building Fund, Donations, Offertory, legacy household dues).
- A **recent contributions list** (family-level): date, category, amount, payment method.
- A clearly-labeled link to **“Download my annual family contribution summary (for tax records)”**.
- A simple **Profile** area: name, address, phone, email, spouse, children, household name.

**What they should be able to do:**
1. Log in with email or member number + password (and reset password securely).
2. View and edit their own profile and household details.
3. Filter their family’s contributions by year and category.
4. Download an annual family contribution summary (PDF or CSV).
5. Switch language (English / Igbo when available).

**What they should expect:**
- They will **never** see other families’ data.
- They will **never** see expense approval screens or admin controls.
- Pages should feel like a church bulletin: clean, calm, and non-technical.
- The annual summary should clearly indicate it is for **personal tax preparation**, not an official IRS receipt.

---

### 5.2 Financial Secretary

**Context:** Front-line operator. Records contributions, manages members, and is the data quality owner.

**What they should see:**
- An **Operations Dashboard** with:
  - New members added this month
  - Contributions recorded this month (count + total)
  - Items needing attention (corrections, missing categories, recent edits)
- A **Members** page: searchable, filterable table; quick actions for add/edit/deactivate; CSV import.
- A **Contributions** page: high-volume entry table with filters, edit history, and export.
- A **Sub-Accounts Overview**: read-only CMO and CWO summary cards + status of monthly summaries submitted by group sub-account managers.

**What they should be able to do:**
1. Register new members (sequential serial number auto-assigned, manual override allowed).
2. Edit or deactivate members.
3. Record dues and donations against the right category and household.
4. Correct prior entries with audit trail.
5. Run searches and export contribution data.

**What they should expect:**
- Add/edit forms are **fast** with sensible defaults (default date = today, last-used category, etc.).
- Audit history is automatically captured — no extra work to comply.
- They can see and reconcile CMO/CWO sub-account summaries but do not manage those sub-account ledgers directly.

---

### 5.3 Treasurer

**Context:** Owns money movement: expenses, balances, reporting. Works closely with Chaplain (for approvals) and Finance Council (for oversight).

**What they should see:**
- A **Finance Dashboard** with:
  - Total income, total expense, net balance
  - Category trends (monthly/quarterly/annual)
  - **Expense pipeline**: Pending / Approved / Rejected counts with quick access
  - CMO/CWO sub-account rollups (opening, in, out, closing)
- An **Expenses** workspace: create expense, attach receipt, submit for Chaplain approval, track status.
- A **Reports** hub: monthly, quarterly, annual reports; per-family annual statements; exports (PDF/CSV/Excel).

**What they should be able to do:**
1. Record and submit an expense (status `Pending`).
2. See where each expense is in the approval flow.
3. View any member’s contribution detail when needed.
4. Generate and export financial reports for council meetings.
5. Generate per-family annual contribution statements on behalf of members who request them.

**What they should expect:**
- Submitting an expense **automatically notifies** the Finance Council and queues it for the Chaplain.
- Approval state is always visible; rejections include a reason.
- Reports are presentation-ready (clean layout, organization header, period clearly labeled).

---

### 5.4 Group Financial Secretary — CMO / CWO Sub-Account Manager

**Context:** Each of CMO and CWO has its own group sub-account; one person manages each. They report **up** to the Financial Secretary and the Finance Council.

**What they should see:**
- A **dedicated Sub-Account Manager page** scoped to their assigned group only (CMO **or** CWO).
- Top of page:
  - **Running balance card** for their sub-account.
  - **Month-to-date in vs out** mini-chart.
  - Status of the latest monthly summary report (Draft / Submitted / Acknowledged).
- A **Record Income** form: date, amount, source/category, payment method, notes.
- A **Record Expense** form: date, amount, category, payee, notes, optional receipt attachment.
- A **Transaction Ledger** for their group only: filter by date range, type, category; export to CSV/PDF.
- A **Monthly Summary** panel: auto-calculated opening / income / expense / closing for the month, with a single “Submit Monthly Report” action.

**What they should be able to do:**
1. Record group income and expenses without touching the central ledger.
2. Filter and review only their group’s transactions.
3. Submit a monthly summary report to the Financial Secretary and Finance Council.
4. Export their group’s records.

**What they should expect:**
- They **cannot** see the other group’s sub-account ledger.
- They **cannot** see per-member contribution detail outside their group’s transactions.
- Submitting a monthly report records an immutable timestamp and submitter; they get a clear confirmation.
- Their experience feels like a focused mini-ledger app, not a full admin panel.

---

### 5.5 Chaplain

**Context:** Pastoral overseer and the **final approver** of expenses. Needs both detailed visibility (when judgment is required) and confidence that the process is auditable.

**What they should see:**
- A **Chaplain Dashboard** with:
  - A prominent **Approval Queue** of pending expenses (oldest first), each row showing amount, category, payee, submitter, date submitted.
  - Aggregate KPIs comparable to the Finance Council view, **plus** the ability to drill down when needed.
- An **Expense Detail** view with full context: amount, category, payee, description, attachments, submitter, prior history.
- **Approve / Reject** controls — rejection requires a reason.

**What they should be able to do:**
1. Review and approve or reject expenses with one clear action.
2. See per-member contribution and expense detail when pastoral judgment requires it.
3. Review aggregate financial health (same as Finance Council).
4. View and download any family’s annual contribution statement when needed.

**What they should expect:**
- The approval action is fast, explicit, and irreversible without an audit entry.
- Every approval/rejection is recorded with actor + timestamp + reason.
- The interface respects the pastoral role: calm, uncluttered, and not transactional in tone.

---

### 5.6 Finance Council

**Context:** Oversight, not operations. Members of this body **must not** see per-family giving detail. They need confidence in totals and trends, and visibility into expense activity.

**What they should see:**
- A **read-only Oversight Dashboard**:
  - Total income, total expenses, net position
  - Monthly and yearly trends
  - Category-level breakdowns
  - **Participation rate** (% of households who paid dues this year)
  - CMO/CWO sub-account rollups (opening / income / expense / closing)
- A **Notifications / Activity feed**: newly submitted expenses, monthly summaries from CMO/CWO sub-account managers.
- **Aggregate exports** (PDF/CSV/Excel) suitable for council meetings.

**What they should be able to do:**
1. Review financial health at a glance.
2. Be informed of every expense submitted (per PRD §4.4).
3. Open and review CMO/CWO monthly summary reports.
4. Export aggregate reports for governance.

**What they should expect:**
- **No per-member drill-down. Ever.** The UI does not even render those links for them.
- Numbers shown match what the Treasurer reports.
- The view is calm, governance-oriented, not operational.

---

### 5.7 System Admin (Tech Owner)

**Context:** The person who keeps the platform running on GitHub Pages + Supabase (per PRD §6). Often a volunteer, possibly the only one.

**What they should see:**
- An **Admin Console** with:
  - Users list with assigned roles, status (active/inactive), last login.
  - Role assignment controls and a **role-permission matrix** view (for verification).
  - **Audit log** explorer with filters by user, entity, action, date.
  - **System health**: backup status, last successful deploy, environment info.
  - Category/sub-account management (activate/deactivate categories, manage CMO/CWO sub-accounts and their assigned managers).

**What they should be able to do:**
1. Create, deactivate, and reassign user accounts and roles.
2. Inspect audit logs and recent admin activity.
3. Verify permission boundaries with the role-permission matrix view.
4. Manage categories, including phasing out the legacy $20/household dues category.
5. Trigger or verify backups and view their status.

**What they should expect:**
- Strong **guardrails**: cannot accidentally over-permission a user (e.g., assigning Chaplain triggers confirmation).
- Clear separation between **operational data** (handled by Financial Secretary/Treasurer) and **system administration**.
- A maintenance experience that is realistic for a single volunteer admin: predictable, low-noise, well-documented.

---

## 6. Core End-to-End UX Flows

### 6.1 Member — View & Download Annual Summary
1. Log in → land on member dashboard.
2. Select a tax year.
3. See totals by category and grand total.
4. Click **Download PDF** (or CSV) → file is generated client-side.
5. Disclaimer: “For personal tax records. Not an official IRS receipt.”

**Success:** A non-technical user can complete this without help.

### 6.2 Financial Secretary — Record a Contribution
1. Open **Add Contribution**.
2. Select member or household (typeahead).
3. Choose category; date defaults to today.
4. Enter amount, payment method, optional notes.
5. Save → toast confirmation + new row appears at top of ledger.
6. Audit log entry is written automatically.

**Success:** Under 30 seconds for a standard entry.

### 6.3 Treasurer → Chaplain — Expense Approval (with Council notification)
1. Treasurer creates expense and submits (status `Pending`).
2. System notifies Finance Council (awareness) and Chaplain (action).
3. Chaplain opens Approval Queue, opens the expense, reviews details and attachment.
4. Chaplain **Approves** or **Rejects** (rejection requires a reason).
5. Status updates everywhere; ledger reflects approved expenses only.

**Success:** Every state transition is visible and auditable.

### 6.4 Group Financial Secretary — Monthly Sub-Account Reporting
1. Throughout the month, record income and expenses for the assigned sub-account.
2. At month end, open the **Monthly Summary** panel.
3. Review auto-calculated opening / income / expense / closing.
4. Click **Submit Monthly Report**.
5. Financial Secretary and Finance Council can now view the submitted report.

**Success:** Two clicks from the Monthly Summary panel to a submitted report.

### 6.5 Finance Council — Quarterly Review
1. Log in → land on Oversight Dashboard.
2. Switch period to “Last Quarter”.
3. Review trends, participation, sub-account rollups.
4. Export aggregate PDF for the council meeting.

**Success:** No accidental exposure of per-member data anywhere in the flow.

### 6.6 System Admin — Onboard a New Treasurer
1. Open **Users**.
2. Invite by email; assign role = Treasurer (confirmation prompt).
3. New user receives email, sets password, lands on Treasurer dashboard.
4. Admin verifies via role-permission matrix that Treasurer cannot approve expenses.

**Success:** Safe onboarding without over-permissioning.

---

## 7. Information Architecture (Proposed)

- `Login` / `Forgot Password`
- `Dashboard` (role-adaptive landing page)
- `Profile` (all roles)
- `Members` — Financial Secretary, Chaplain, Admin
- `Contributions` — Financial Secretary, Treasurer, Chaplain, Admin
- `Expenses` — Treasurer, Chaplain, Admin
- `Approvals` — Chaplain (primary), Admin
- `Sub-Accounts`
  - Group Financial Secretary sees their assigned group only
  - Financial Secretary / Treasurer / Chaplain / Admin see both CMO and CWO
  - Finance Council sees aggregate rollups only
- `Reports` — role-scoped exports
- `Audit Log` — Admin (and Chaplain if council decides)
- `Users & Roles` — Admin only
- `Settings` — language, password, notifications

---

## 8. Content & Tone Guidelines

- Plain, respectful, community-appropriate language.
- Use **household / family** consistently for member-facing copy.
- Avoid jargon for members; use precise financial terms only in admin views.
- For finance actions, always state the **status** and the **date**.

Examples:
- “Contribution recorded successfully.”
- “Pending Chaplain approval.”
- “You are viewing aggregate data only.”
- “For personal tax records. Not an official IRS receipt.”

---

## 9. Visibility & Privacy Boundaries (UX Enforcement)

These rules from PRD §5 / §7 must be reflected in the UI itself, not just the backend:

- Members see **only their own household** data.
- Finance Council sees **aggregates only** — per-member links are not rendered.
- Group Financial Secretaries see **only their assigned sub-account**.
- Per-member detail is reserved for Financial Secretary, Treasurer, Chaplain, Admin.
- Every page enforces these rules at render time and on direct URL access.

---

## 10. UX Acceptance Criteria by Role

| Role | A person in this role can… |
|---|---|
| Member | Log in, view their family’s giving for any year, and download an annual summary without assistance. |
| Financial Secretary | Create a member and record a contribution in one uninterrupted flow under 30 seconds. |
| Treasurer | Submit an expense and follow its status to final approval/rejection. |
| Group Financial Secretary | Manage only their assigned CMO or CWO sub-account and submit a monthly summary. |
| Chaplain | Decide pending expenses with full context and a visible audit trail. |
| Finance Council | See aggregate finances and CMO/CWO rollups with **no** per-member leakage. |
| System Admin | Onboard/offboard users safely and verify permission boundaries. |

---

## 11. Open UX Decisions (to confirm with stakeholders)

1. Default post-login landing page for users who hold **multiple roles** — role picker or primary-role dashboard?
2. Mobile-first vs desktop-first emphasis for leadership dashboards.
3. Default reporting period on dashboards — current month, YTD, or last 90 days?
4. Monthly summary reminders for sub-account managers — email only, or email + in-app?
5. Final wording of the member-facing tax summary disclaimer (legal/pastoral review).
6. Whether the Chaplain should have a backup approver in the UI (linked to PRD §9.2 Q2).

---

## 12. Next UX Deliverables

- Low-fidelity wireframes for each role’s landing page.
- High-fidelity mockups for:
  - Member dashboard + Annual Summary page
  - Treasurer expense workflow
  - Chaplain approval queue and detail view
  - Group Sub-Account Manager page (CMO/CWO)
  - Finance Council oversight dashboard
- Usability test script per role for pre-launch validation.
