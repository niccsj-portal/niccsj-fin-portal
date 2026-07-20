-- 20260630140000__expenses_and_notifications.sql
-- Sprint 5 story 5.1 — expenses + expense_notifications tables, RLS, audit.
--
-- References:
--   * PRD §4.4   expense recording + approval workflow (Treasurer submits →
--                Finance Council notified → Chaplain approves/rejects)
--   * PRD §6.3   expenses / expense_notifications data model + conventions
--   * PRD §6.4   server-side Edge Functions own the status transitions
--   * PRD §7     "Submit expense" = Treasurer / Admin;
--                "Approve / reject expense" = Chaplain / Admin;
--                "Notified of expenses" = FS / Treasurer / Chaplain /
--                Finance Council / Admin.
--   * backlog §4.6 story 5.1
--
-- Conventions (PRD §6.3, asserted by src/test/migrations.sprint5.test.ts):
--   * money columns use numeric(12,2)
--   * timestamps use timestamptz default now()
--   * no hard deletes on financial rows — soft delete via is_active
--   * created_by / updated_by are stamped from auth.uid() via a BEFORE trigger
--   * row level security enabled, policies attached here
--
-- The actual pending → approved/rejected transitions run through the
-- `approve-expense` / `reject-expense` Edge Functions (story 5.4) using the
-- service role, which bypasses RLS. The UPDATE policies below are defence in
-- depth for any authenticated-client path and keep the "only Chaplain/Admin
-- flip status" rule (story 5.9) enforceable at the row level too.

begin;

------------------------------------------------------------------------------
-- Role predicates (PRD §7)
------------------------------------------------------------------------------
-- Who may SUBMIT an expense (create + edit a pending row): Treasurer, Admin.
create or replace function public.is_expense_recorder()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'treasurer'::public.app_role,
    'admin'::public.app_role
  );
$$;

revoke all on function public.is_expense_recorder() from public;
grant execute on function public.is_expense_recorder() to authenticated;

-- Who may APPROVE / REJECT an expense (flip status): Chaplain, Admin.
-- Chaplain holds final authority (PRD §3.4, §7, decision AR-7). Distinct from
-- is_expense_recorder(): the submitter can never approve their own expense.
create or replace function public.is_expense_approver()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'chaplain'::public.app_role,
    'admin'::public.app_role
  );
$$;

revoke all on function public.is_expense_approver() from public;
grant execute on function public.is_expense_approver() to authenticated;

-- Who may READ expenses ("Notified of expenses", PRD §7): Financial Secretary,
-- Treasurer, Chaplain, Finance Council, Admin. (Group FS is "optional" in the
-- matrix and is excluded from the global expense ledger for v1.)
create or replace function public.is_expense_reader()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'fin_secretary'::public.app_role,
    'treasurer'::public.app_role,
    'chaplain'::public.app_role,
    'finance_council'::public.app_role,
    'admin'::public.app_role
  );
$$;

revoke all on function public.is_expense_reader() from public;
grant execute on function public.is_expense_reader() to authenticated;

------------------------------------------------------------------------------
-- expenses
------------------------------------------------------------------------------
-- One row per recorded expense (PRD §4.4, §6.3).
--   * status drives the approval workflow: pending → approved | rejected.
--   * receipt_path points at a private Storage object (story 5.2); the file is
--     only ever served through a short-lived signed URL, never a public URL.
--   * submitted_by / approved_by / decided_at capture the workflow actors for
--     auditability (PRD §4.4 "record the approver, decision, and timestamp").
--   * rejection_reason is mandatory when status = 'rejected' (PRD §4.4).
create table if not exists public.expenses (
    id                  uuid primary key default gen_random_uuid(),
    category_id         uuid not null references public.categories(id) on delete restrict,
    payee               text not null,
    description         text,
    expense_date        date not null default current_date,
    amount              numeric(12,2) not null check (amount > 0),
    status              text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
    receipt_path        text,
    rejection_reason    text,
    submitted_by        uuid references auth.users(id) on delete set null,
    approved_by         uuid references auth.users(id) on delete set null,
    decided_at          timestamptz,
    is_active           boolean not null default true,
    created_by          uuid references auth.users(id) on delete set null,
    updated_by          uuid references auth.users(id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    -- A rejected expense must carry a reason (PRD §4.4 step 3).
    constraint expenses_rejection_reason_required
      check (status <> 'rejected' or rejection_reason is not null)
);

comment on table public.expenses is
    'Recorded expenses with a pending → approved/rejected approval workflow. PRD §4.4. Soft delete via is_active.';

create index if not exists expenses_status_idx
    on public.expenses (status);
create index if not exists expenses_category_id_idx
    on public.expenses (category_id);
create index if not exists expenses_date_idx
    on public.expenses (expense_date desc);

------------------------------------------------------------------------------
-- expense_notifications
------------------------------------------------------------------------------
-- Fan-out awareness rows: when an expense is submitted, the submit-expense
-- Edge Function (story 5.3) inserts one row per notified user (Finance Council
-- + Chaplain + others per PRD §7 "Notified of expenses"). In-app for v1; email
-- follows in v1.5 (PRD §4.7). Each recipient reads + marks their own rows read.
create table if not exists public.expense_notifications (
    id                  uuid primary key default gen_random_uuid(),
    expense_id          uuid not null references public.expenses(id) on delete cascade,
    notified_user_id    uuid not null references auth.users(id) on delete cascade,
    is_read             boolean not null default false,
    notified_at         timestamptz not null default now()
);

comment on table public.expense_notifications is
    'Per-recipient in-app notifications that an expense was submitted. PRD §4.4, §4.7.';

create index if not exists expense_notifications_user_idx
    on public.expense_notifications (notified_user_id);
create index if not exists expense_notifications_expense_idx
    on public.expense_notifications (expense_id);

------------------------------------------------------------------------------
-- Actor stamping (PRD §6.3: created_by / updated_by set via triggers)
------------------------------------------------------------------------------
-- BEFORE trigger so created_by/updated_by come from auth.uid() and can never
-- be spoofed by the client. created_by is immutable after insert.
create or replace function public.set_expense_actor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.submitted_by := coalesce(new.submitted_by, auth.uid());
    new.updated_at := now();
  elsif (tg_op = 'UPDATE') then
    new.created_by := old.created_by; -- immutable
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

comment on function public.set_expense_actor() is
  'BEFORE trigger: stamps created_by/updated_by/submitted_by/updated_at from auth.uid(). PRD §6.3.';

drop trigger if exists set_expense_actor on public.expenses;
create trigger set_expense_actor
  before insert or update on public.expenses
  for each row execute function public.set_expense_actor();

------------------------------------------------------------------------------
-- Row Level Security — expenses
------------------------------------------------------------------------------
alter table public.expenses enable row level security;

-- Anyone "notified of expenses" reads the ledger (PRD §7).
drop policy if exists expenses_select_reader on public.expenses;
create policy expenses_select_reader on public.expenses
  for select
  to authenticated
  using (public.is_expense_reader());

-- Only recorders (Treasurer / Admin) create an expense.
drop policy if exists expenses_insert_recorder on public.expenses;
create policy expenses_insert_recorder on public.expenses
  for insert
  to authenticated
  with check (public.is_expense_recorder());

-- Recorders may edit a still-pending expense's details (payee/amount/etc.).
drop policy if exists expenses_update_recorder on public.expenses;
create policy expenses_update_recorder on public.expenses
  for update
  to authenticated
  using (public.is_expense_recorder() and status = 'pending')
  with check (public.is_expense_recorder());

-- Only approvers (Chaplain / Admin) may flip status (PRD §7, story 5.9).
-- The real transition runs through the Edge Functions (service role); this
-- keeps the rule enforceable for any direct authenticated update too.
drop policy if exists expenses_update_approver on public.expenses;
create policy expenses_update_approver on public.expenses
  for update
  to authenticated
  using (public.is_expense_approver())
  with check (public.is_expense_approver());

-- No DELETE policy: financial rows are never hard-deleted (PRD §6.3); a
-- rejected expense is archived with its reason.

------------------------------------------------------------------------------
-- Row Level Security — expense_notifications
------------------------------------------------------------------------------
alter table public.expense_notifications enable row level security;

-- A recipient reads only their own notifications.
drop policy if exists expense_notifications_select_own on public.expense_notifications;
create policy expense_notifications_select_own on public.expense_notifications
  for select
  to authenticated
  using (notified_user_id = auth.uid());

-- A recipient marks only their own notifications read.
drop policy if exists expense_notifications_update_own on public.expense_notifications;
create policy expense_notifications_update_own on public.expense_notifications
  for update
  to authenticated
  using (notified_user_id = auth.uid())
  with check (notified_user_id = auth.uid());

-- Fan-out rows are written by the submit-expense Edge Function (service role,
-- bypasses RLS). This policy is the defence-in-depth fallback for a
-- recorder-driven client path.
drop policy if exists expense_notifications_insert_recorder on public.expense_notifications;
create policy expense_notifications_insert_recorder on public.expense_notifications
  for insert
  to authenticated
  with check (public.is_expense_recorder());

------------------------------------------------------------------------------
-- Audit trail (story 1.4 framework) — every expense state change is logged.
------------------------------------------------------------------------------
select public.attach_audit_trigger('public.expenses');

------------------------------------------------------------------------------
-- Seed standard expense categories (PRD §4.4). All are expense-type.
-- Idempotent via the categories_name_type_unique (name, type) constraint.
------------------------------------------------------------------------------
insert into public.categories (name, type, is_active)
values
    ('Hall / Venue Rental',   'expense', true),
    ('Utilities',             'expense', true),
    ('Liturgical Supplies',   'expense', true),
    ('Events & Hospitality',  'expense', true),
    ('Charity & Welfare',     'expense', true),
    ('Administration',        'expense', true),
    ('Miscellaneous',         'expense', true)
on conflict (name, type) do nothing;

commit;
