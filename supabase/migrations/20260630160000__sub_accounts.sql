-- 20260630160000__sub_accounts.sql
-- Sprint 6 stories 6.1 + 6.2 — CMO/CWO sub-account schema, RLS, audit, seed.
--
-- References:
--   * PRD §4.5   group sub-account ledger (income + expense) + monthly summary
--   * PRD §6.3   sub-account data model + conventions
--   * PRD §6.4   submit-sub-account-report Edge Function owns the snapshot write
--   * PRD §7     a Group Financial Secretary sees ONLY their assigned group;
--                Finance Council / FS / Treasurer / Admin read rollups
--   * backlog §4.7 stories 6.1 (schema + RLS) and 6.2 (seed CMO + CWO)
--
-- Conventions (PRD §6.3, asserted by src/test/migrations.sprint6.test.ts):
--   * money columns use numeric(12,2)
--   * timestamps use timestamptz default now()
--   * no hard deletes on financial rows — soft delete via is_active
--   * created_by / updated_by stamped from auth.uid() via a BEFORE trigger
--   * row level security enabled, policies attached here
--
-- Group isolation is enforced by RLS through `caller_sub_account_ids()` — a
-- SECURITY DEFINER helper that returns the sub-account ids the caller is
-- assigned to (via sub_account_users). This mirrors `caller_household_id()`
-- from the member-self work (migration 20260626101000). The immutable monthly
-- snapshot is written by the `submit-sub-account-report` Edge Function (service
-- role, story 6.4); the client-facing INSERT policy here is defence in depth.

begin;

------------------------------------------------------------------------------
-- Role predicate — who reads sub-account rollups across all groups (PRD §7)
------------------------------------------------------------------------------
-- Finance Council + leadership read every sub-account (Sprint 7 rollups); a
-- Group FS is NOT an overseer — they are scoped to their assignment instead.
create or replace function public.is_sub_account_overseer()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'fin_secretary'::public.app_role,
    'treasurer'::public.app_role,
    'finance_council'::public.app_role,
    'admin'::public.app_role
  );
$$;

revoke all on function public.is_sub_account_overseer() from public;
grant execute on function public.is_sub_account_overseer() to authenticated;

------------------------------------------------------------------------------
-- sub_accounts — one row per group ledger (CMO, CWO, …)
------------------------------------------------------------------------------
create table if not exists public.sub_accounts (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    description text,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.sub_accounts is
    'Group sub-account ledgers (CMO/CWO). PRD §4.5. slug is the stable code (cmo/cwo).';

------------------------------------------------------------------------------
-- sub_account_users — which Group Financial Secretary manages which group
------------------------------------------------------------------------------
-- The assignment is the authorization boundary: every scoped RLS policy joins
-- through this table. Admin maintains assignments (Sprint 9 §9.6 UI).
create table if not exists public.sub_account_users (
    id              uuid primary key default gen_random_uuid(),
    sub_account_id  uuid not null references public.sub_accounts(id) on delete cascade,
    user_id         uuid not null references auth.users(id) on delete cascade,
    created_at      timestamptz not null default now(),
    unique (sub_account_id, user_id)
);

comment on table public.sub_account_users is
    'Assigns Group Financial Secretary users to a sub-account. The RLS scoping boundary (PRD §7).';

create index if not exists sub_account_users_user_idx
    on public.sub_account_users (user_id);
create index if not exists sub_account_users_account_idx
    on public.sub_account_users (sub_account_id);

------------------------------------------------------------------------------
-- caller_sub_account_ids() — the sub-account ids the caller may manage
------------------------------------------------------------------------------
-- SECURITY DEFINER so it can read sub_account_users regardless of the caller's
-- own RLS visibility; STABLE; search_path pinned (OWASP A03). Returns zero rows
-- for anyone with no assignment, which makes the scoped policies fail closed.
create or replace function public.caller_sub_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select sau.sub_account_id
  from public.sub_account_users sau
  where sau.user_id = auth.uid();
$$;

comment on function public.caller_sub_account_ids() is
  'Returns the sub_account ids the authenticated caller is assigned to. The group-isolation primitive (PRD §7).';

revoke all on function public.caller_sub_account_ids() from public;
grant execute on function public.caller_sub_account_ids() to authenticated;

------------------------------------------------------------------------------
-- sub_account_transactions — the scoped income/expense ledger
------------------------------------------------------------------------------
create table if not exists public.sub_account_transactions (
    id              uuid primary key default gen_random_uuid(),
    sub_account_id  uuid not null references public.sub_accounts(id) on delete restrict,
    direction       text not null check (direction in ('income', 'expense')),
    category_id     uuid references public.categories(id) on delete restrict,
    payee           text,
    description     text,
    amount          numeric(12,2) not null check (amount > 0),
    txn_date        date not null default current_date,
    is_active       boolean not null default true,
    created_by      uuid references auth.users(id) on delete set null,
    updated_by      uuid references auth.users(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.sub_account_transactions is
    'Group-scoped income/expense entries. PRD §4.5. Soft delete via is_active.';

create index if not exists sub_account_transactions_account_idx
    on public.sub_account_transactions (sub_account_id);
create index if not exists sub_account_transactions_date_idx
    on public.sub_account_transactions (txn_date desc);
create index if not exists sub_account_transactions_direction_idx
    on public.sub_account_transactions (direction);

------------------------------------------------------------------------------
-- sub_account_reports — immutable monthly summary snapshots
------------------------------------------------------------------------------
-- One row per (sub_account, year, month). Written by the submit Edge Function;
-- opening/income/expense/closing are a point-in-time snapshot and never edited
-- after submission. Council acknowledgement (Sprint 7) flips status only.
create table if not exists public.sub_account_reports (
    id              uuid primary key default gen_random_uuid(),
    sub_account_id  uuid not null references public.sub_accounts(id) on delete restrict,
    period_year     integer not null,
    period_month    integer not null check (period_month between 1 and 12),
    opening_balance numeric(12,2) not null default 0,
    total_income    numeric(12,2) not null default 0,
    total_expense   numeric(12,2) not null default 0,
    closing_balance numeric(12,2) not null default 0,
    status          text not null default 'submitted'
                      check (status in ('submitted', 'acknowledged')),
    submitted_by    uuid references auth.users(id) on delete set null,
    submitted_at    timestamptz not null default now(),
    acknowledged_by uuid references auth.users(id) on delete set null,
    acknowledged_at timestamptz,
    created_at      timestamptz not null default now(),
    unique (sub_account_id, period_year, period_month)
);

comment on table public.sub_account_reports is
    'Immutable monthly sub-account summary snapshots (opening/income/expense/closing). PRD §4.5/§6.4.';

create index if not exists sub_account_reports_account_idx
    on public.sub_account_reports (sub_account_id);

------------------------------------------------------------------------------
-- Actor stamping (PRD §6.3) — transactions only (reports are snapshot writes)
------------------------------------------------------------------------------
create or replace function public.set_sub_account_txn_actor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.updated_at := now();
  elsif (tg_op = 'UPDATE') then
    new.created_by := old.created_by; -- immutable
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

comment on function public.set_sub_account_txn_actor() is
  'BEFORE trigger: stamps created_by/updated_by/updated_at on sub_account_transactions from auth.uid(). PRD §6.3.';

drop trigger if exists set_sub_account_txn_actor on public.sub_account_transactions;
create trigger set_sub_account_txn_actor
  before insert or update on public.sub_account_transactions
  for each row execute function public.set_sub_account_txn_actor();

------------------------------------------------------------------------------
-- Row Level Security — sub_accounts
------------------------------------------------------------------------------
alter table public.sub_accounts enable row level security;

-- An overseer reads every group; an assigned manager reads their own group(s).
drop policy if exists sub_accounts_select on public.sub_accounts;
create policy sub_accounts_select on public.sub_accounts
  for select
  to authenticated
  using (
    public.is_sub_account_overseer()
    or id in (select public.caller_sub_account_ids())
  );

-- Only Admin creates/edits sub-accounts (assignments + seeds; Sprint 9 UI).
drop policy if exists sub_accounts_insert_admin on public.sub_accounts;
create policy sub_accounts_insert_admin on public.sub_accounts
  for insert
  to authenticated
  with check (public.app_role() = 'admin'::public.app_role);

drop policy if exists sub_accounts_update_admin on public.sub_accounts;
create policy sub_accounts_update_admin on public.sub_accounts
  for update
  to authenticated
  using (public.app_role() = 'admin'::public.app_role)
  with check (public.app_role() = 'admin'::public.app_role);

------------------------------------------------------------------------------
-- Row Level Security — sub_account_users
------------------------------------------------------------------------------
alter table public.sub_account_users enable row level security;

-- A user sees their own assignment; Admin sees + manages every assignment.
drop policy if exists sub_account_users_select on public.sub_account_users;
create policy sub_account_users_select on public.sub_account_users
  for select
  to authenticated
  using (user_id = auth.uid() or public.app_role() = 'admin'::public.app_role);

drop policy if exists sub_account_users_insert_admin on public.sub_account_users;
create policy sub_account_users_insert_admin on public.sub_account_users
  for insert
  to authenticated
  with check (public.app_role() = 'admin'::public.app_role);

drop policy if exists sub_account_users_delete_admin on public.sub_account_users;
create policy sub_account_users_delete_admin on public.sub_account_users
  for delete
  to authenticated
  using (public.app_role() = 'admin'::public.app_role);

------------------------------------------------------------------------------
-- Row Level Security — sub_account_transactions (group isolation)
------------------------------------------------------------------------------
alter table public.sub_account_transactions enable row level security;

-- Read: overseers see all; an assigned manager sees only their group(s).
drop policy if exists sub_account_transactions_select on public.sub_account_transactions;
create policy sub_account_transactions_select on public.sub_account_transactions
  for select
  to authenticated
  using (
    public.is_sub_account_overseer()
    or sub_account_id in (select public.caller_sub_account_ids())
  );

-- Insert: only the assigned manager records for their own group.
drop policy if exists sub_account_transactions_insert on public.sub_account_transactions;
create policy sub_account_transactions_insert on public.sub_account_transactions
  for insert
  to authenticated
  with check (sub_account_id in (select public.caller_sub_account_ids()));

-- Update: an assigned manager may correct a still-active entry in their group.
drop policy if exists sub_account_transactions_update on public.sub_account_transactions;
create policy sub_account_transactions_update on public.sub_account_transactions
  for update
  to authenticated
  using (sub_account_id in (select public.caller_sub_account_ids()))
  with check (sub_account_id in (select public.caller_sub_account_ids()));

-- No DELETE policy: financial rows are soft-deleted via is_active (PRD §6.3).

------------------------------------------------------------------------------
-- Row Level Security — sub_account_reports
------------------------------------------------------------------------------
alter table public.sub_account_reports enable row level security;

-- Read: overseers see all rollups; an assigned manager sees their own reports.
drop policy if exists sub_account_reports_select on public.sub_account_reports;
create policy sub_account_reports_select on public.sub_account_reports
  for select
  to authenticated
  using (
    public.is_sub_account_overseer()
    or sub_account_id in (select public.caller_sub_account_ids())
  );

-- Insert: defence in depth for the assigned manager. The real snapshot write
-- runs through the submit-sub-account-report Edge Function (service role).
drop policy if exists sub_account_reports_insert on public.sub_account_reports;
create policy sub_account_reports_insert on public.sub_account_reports
  for insert
  to authenticated
  with check (sub_account_id in (select public.caller_sub_account_ids()));

-- No client UPDATE/DELETE policy: a submitted report is immutable; Council
-- acknowledgement (Sprint 7) runs through the service role.

------------------------------------------------------------------------------
-- Audit trail (story 1.4 framework) — every financial state change is logged.
------------------------------------------------------------------------------
select public.attach_audit_trigger('public.sub_account_transactions');
select public.attach_audit_trigger('public.sub_account_reports');

------------------------------------------------------------------------------
-- Seed the CMO + CWO sub-accounts (story 6.2). Idempotent via the slug unique.
-- Group Financial Secretary assignments are data (Admin-managed), not seeded
-- here — user ids are environment-specific.
------------------------------------------------------------------------------
insert into public.sub_accounts (slug, name, description, is_active)
values
    ('cmo', 'Catholic Men Organisation (CMO)',   'CMO group sub-account ledger.',   true),
    ('cwo', 'Catholic Women Organisation (CWO)', 'CWO group sub-account ledger.',   true)
on conflict (slug) do nothing;

commit;
