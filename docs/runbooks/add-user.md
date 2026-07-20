# Runbook — Add / Onboard a User

**Audience:** System Admin
**Applies to:** NICC-SJ Finance & Membership Portal
**Related:** PRD §4.1, §7, backlog Sprint 9 stories 9.1/9.6, Admin Console

Every account maps to one `auth.users` row and one `public.users` profile row
(with a `role`). Roles drive the UI; **Row Level Security is the real boundary**.

---

## 1. Roles at a glance

| Role | Grants |
|---|---|
| `member` | Own profile + own family contributions + own annual summary. |
| `fin_secretary` | Member CRUD, main-ledger contributions, signature, summaries. |
| `treasurer` | Contributions, expense submission, dashboards. |
| `group_fin_sec` | One assigned CMO/CWO sub-account ledger only. |
| `chaplain` | Member CRUD, expense **approval**, per-member visibility, audit (optional). |
| `finance_council` | **Aggregate-only** dashboards + expense notifications. |
| `admin` | Everything, incl. Admin Console. 2FA is **mandatory**. |

See the live matrix at **Admin Console → Role-permission matrix** (`/admin/permissions`).

## 2. Create the account

1. Supabase dashboard → **Authentication → Users → Add user** (email + a temporary
   password), or send an invite. Confirm the email.
2. Ensure a matching row exists in `public.users` (the login trigger/seed creates
   it). The default role is `member`.

## 3. Assign the role (Admin Console)

1. Sign in as an Admin → **Admin Console → Users & roles** (`/admin/users`).
2. Find the user by email; pick the target role from the dropdown.
3. **Elevations require confirmation** — confirm in the dialog.
4. For a **Group Financial Secretary**, also open **Admin Console → Sub-accounts &
   Group FS** (`/admin/sub-accounts`) and assign them to CMO or CWO. This
   assignment is what scopes their ledger.

## 4. Two-factor authentication

- **Admin** accounts: 2FA is mandatory — have them enrol at `/security/2fa` on
  first sign-in.
- FS / Treasurer / Group FS / Chaplain / Finance Council: 2FA is opt-in but
  recommended.

## 5. Link to a member record (optional)

If the account belongs to a person on the roster, set `users.member_id` to their
`members.id` so "own family" views resolve. FS/Admin can do this via SQL or the
member tools.

## 6. Verify

- [ ] User can sign in and lands on the correct role dashboard.
- [ ] Nav shows only the permitted sections.
- [ ] (Group FS) sees exactly their assigned sub-account, nothing else.
- [ ] (Admin) has completed 2FA enrolment.

## 7. Offboarding

- Prefer **Deactivate** (Admin Console → Users & roles) over deletion — records
  are never hard-deleted. Deactivation blocks access while preserving audit trail.
