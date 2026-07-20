# Runbook — Monthly Checks

**Audience:** System Admin
**Applies to:** NICC-SJ Finance & Membership Portal
**Cadence:** First working session of each month
**Related:** `backup.md`, `deploy.md`, `add-user.md`, `/admin/health`

A short, repeatable health routine for a volunteer-run system.

---

## 1. System health (`/admin/health`)

- [ ] **Supabase connectivity** shows **Online**.
- [ ] **Deployed version** matches the latest `main` commit.
- [ ] **Recent client errors (30 days)** is low; investigate spikes via the
      audit log / Supabase logs.
- [ ] **Last backup** date is current (this month).
- [ ] **Lighthouse a11y** Login 100, Dashboard 96, Contribution 95, Reports 95.

## 2. Backup

- [ ] Take/confirm this month's backup (`backup.md` §2).
- [ ] Update `LAST_BACKUP` repo variable so `/admin/health` reflects it.

## 3. Financial sanity (aggregate)

- [ ] Treasurer dashboard: Income / Expense / Net look plausible vs. last month.
- [ ] **Pending approvals** queue isn't stale — nudge the Chaplain if items are aging.
- [ ] CMO/CWO sub-account monthly summaries submitted for the prior month.

## 4. Access review

- [ ] **Admin Console → Users & roles**: no unexpected role elevations; deactivate
      accounts for anyone who has left a role.
- [ ] All **Admin** accounts still have 2FA enabled.
- [ ] Group FS ↔ sub-account assignments are correct (`/admin/sub-accounts`).

## 5. Audit spot-check

- [ ] **Admin Console → Audit log**: scan the last month for any `delete`s or
      unexpected actors on `contributions` / `expenses` / `users`.

## 6. Dependencies & security

- [ ] Review open **Dependabot** PRs; merge safe patch/minor updates via CI.
- [ ] Confirm no secrets were committed (CI/secret scan clean).

## 7. Categories

- [ ] **Admin Console → Categories**: legacy $20 household dues remains
      deactivated (phased out) unless the council decides otherwise.

---

**Sign-off:** _Admin name / date_ ______________________
