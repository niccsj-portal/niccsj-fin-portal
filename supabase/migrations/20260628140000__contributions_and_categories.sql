-- 20260628140000__contributions_and_categories.sql
-- Sprint 4 story 4.1 — contributions ledger table, RLS, audit, category seed.
--
-- References:
--   * PRD §4.3   contribution categories + recording rules
--   * PRD §6.3   contributions / categories data model + conventions
--   * PRD §7     "Record contribution (main ledger)": FS, Treasurer, Admin only
--                (Chaplain has full read/per-member visibility but does NOT
--                 record on the main ledger — that is the sub-account path).
--   * backlog §4.5 story 4.1
--
-- Conventions (PRD §6.3, asserted by src/test/migrations.sprint4.test.ts):
--   * money columns use numeric(12,2)
--   * timestamps use timestamptz default now()
--   * no hard deletes on financial rows — soft delete via is_active
--   * row level security enabled, policies attached here
--
-- The `categories` table itself was created in story 1.1; this migration only
-- seeds the standard contribution (income) categories. Donation sub-categories
-- are created ad-hoc from the Add Contribution form (story 4.3) using
-- parent_id = the seeded "Donations" parent.

begin;

------------------------------------------------------------------------------
-- contributions
------------------------------------------------------------------------------
-- One row per recorded dues/donation payment (PRD §4.3, §6.3).
--   * household_id is the family unit the giving rolls up to (drives the
--     member-facing family view via caller_household_id()).
--   * member_id is the individual the payment is attributed to (nullable so a
--     household-level payment with no specific member still records).
--   * created_by / updated_by track the recorder for the audit trail; the
--     generic audit trigger (story 1.4) also writes a before/after snapshot.
create table if not exists public.contributions (
    id                  uuid primary key default gen_random_uuid(),
    member_id           uuid references public.members(id) on delete restrict,
    household_id        uuid not null references public.households(id) on delete restrict,
    contribution_date   date not null default current_date,
    amount              numeric(12,2) not null check (amount > 0),
    category_id         uuid not null references public.categories(id) on delete restrict,
    payment_method      text not null
                          check (payment_method in ('cash', 'check', 'zelle', 'card', 'other')),
    notes               text,
    is_active           boolean not null default true,
    created_by          uuid references auth.users(id) on delete set null,
    updated_by          uuid references auth.users(id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.contributions is
    'Recorded dues / donations on the main ledger. PRD §4.3. Soft delete via is_active.';

create index if not exists contributions_household_id_idx
    on public.contributions (household_id);
create index if not exists contributions_member_id_idx
    on public.contributions (member_id);
create index if not exists contributions_category_id_idx
    on public.contributions (category_id);
create index if not exists contributions_date_idx
    on public.contributions (contribution_date desc);

------------------------------------------------------------------------------
-- Recorder predicate (PRD §7 "Record contribution (main ledger)")
------------------------------------------------------------------------------
-- Distinct from is_member_editor() (which includes Chaplain): only the
-- Financial Secretary, Treasurer, and System Admin record on the main ledger.
create or replace function public.is_contribution_recorder()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'fin_secretary'::public.app_role,
    'treasurer'::public.app_role,
    'admin'::public.app_role
  );
$$;

revoke all on function public.is_contribution_recorder() from public;
grant execute on function public.is_contribution_recorder() to authenticated;

------------------------------------------------------------------------------
-- Actor stamping (PRD §6.3: created_by / updated_by set via triggers)
------------------------------------------------------------------------------
-- BEFORE trigger so created_by/updated_by come from auth.uid() and can never
-- be spoofed by the client. created_by is immutable after insert; updated_by
-- + updated_at refresh on every change. The AFTER audit trigger (story 1.4)
-- then captures these columns in its before/after snapshot.
create or replace function public.set_contribution_actor()
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

comment on function public.set_contribution_actor() is
  'BEFORE trigger: stamps created_by/updated_by/updated_at from auth.uid(). PRD §6.3.';

drop trigger if exists set_contribution_actor on public.contributions;
create trigger set_contribution_actor
  before insert or update on public.contributions
  for each row execute function public.set_contribution_actor();


------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------
alter table public.contributions enable row level security;

-- A member reads only their own household's giving (PRD §7
-- "View own/family contributions").
drop policy if exists contributions_select_own_household on public.contributions;
create policy contributions_select_own_household on public.contributions
  for select
  using (household_id = public.caller_household_id());

-- Privileged readers (FS / Treasurer / Chaplain / Admin) see every row
-- (PRD §7 "View per-member financial details").
drop policy if exists contributions_select_privileged on public.contributions;
create policy contributions_select_privileged on public.contributions
  for select
  using (public.is_privileged_reader());

-- Only recorders may create or correct ledger entries.
drop policy if exists contributions_insert_recorder on public.contributions;
create policy contributions_insert_recorder on public.contributions
  for insert
  with check (public.is_contribution_recorder());

drop policy if exists contributions_update_recorder on public.contributions;
create policy contributions_update_recorder on public.contributions
  for update
  using (public.is_contribution_recorder())
  with check (public.is_contribution_recorder());

-- No DELETE policy: financial rows are never hard-deleted (PRD §6.3); a
-- correction soft-deactivates or edits with a reason (story 4.5).

------------------------------------------------------------------------------
-- Audit trail (story 1.4 framework)
------------------------------------------------------------------------------
select public.attach_audit_trigger('public.contributions');

------------------------------------------------------------------------------
-- Seed standard contribution categories (PRD §4.3 initial set)
------------------------------------------------------------------------------
-- All are income-type. "Donations" is the parent for ad-hoc sub-categories
-- created from the form (story 4.3). The legacy $20 household dues category is
-- seeded active so historical/phase-out entries can still be recorded; the
-- category-management UI (Sprint 9) flips it inactive once retired (PRD §4.3).
-- Idempotent via the categories_name_type_unique (name, type) constraint.
insert into public.categories (name, type, is_active)
values
    ('CMO Dues',                       'income', true),
    ('CWO Dues',                       'income', true),
    ('Harvest',                        'income', true),
    ('Building Fund',                  'income', true),
    ('Donations',                      'income', true),
    ('Offertory',                      'income', true),
    ('Legacy Annual Household Dues',   'income', true)
on conflict (name, type) do nothing;

commit;
