-- 20260626101000__rls_policies.sql
-- Sprint 1 story 1.3 — RLS policy skeleton for users / members / households.
--
-- References:
--   * PRD §7     roles & permissions matrix (source of truth)
--   * technology.md §6.2  RLS is the authoritative authorization layer
--
-- This is the *skeleton* set of policies. Sprint 9 (PM.md §8 risk row) adds
-- the exhaustive pgTAP coverage and refines edge cases. RLS was already
-- enabled on every table in story 1.1; here we attach named policies.
--
-- Role helpers used below:
--   auth.uid()        -> the caller's auth.users.id
--   public.app_role() -> the caller's app_role (story 1.2)
--
-- "Privileged readers" (can see any member/household) per PRD §7
-- "View any member profile": fin_secretary, treasurer, chaplain, admin.
-- "Create/edit member": fin_secretary, chaplain, admin.

begin;

------------------------------------------------------------------------------
-- Convenience predicate functions (kept small + STABLE)
------------------------------------------------------------------------------
-- True when the caller may read every member/household row.
create or replace function public.is_privileged_reader()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'fin_secretary'::public.app_role,
    'treasurer'::public.app_role,
    'chaplain'::public.app_role,
    'admin'::public.app_role
  );
$$;

-- True when the caller may create/edit member + household records.
create or replace function public.is_member_editor()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() in (
    'fin_secretary'::public.app_role,
    'chaplain'::public.app_role,
    'admin'::public.app_role
  );
$$;

-- The household the caller belongs to (via users.member_id -> members).
create or replace function public.caller_household_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.household_id
  from public.users u
  join public.members m on m.id = u.member_id
  where u.id = auth.uid();
$$;

revoke all on function public.is_privileged_reader() from public;
revoke all on function public.is_member_editor() from public;
revoke all on function public.caller_household_id() from public;
grant execute on function public.is_privileged_reader() to authenticated;
grant execute on function public.is_member_editor() to authenticated;
grant execute on function public.caller_household_id() to authenticated;

------------------------------------------------------------------------------
-- users — a user reads their own row; admins manage all
------------------------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select
  using (id = auth.uid());

drop policy if exists users_select_admin on public.users;
create policy users_select_admin on public.users
  for select
  using (public.app_role() = 'admin'::public.app_role);

-- Only admins create / change roles (PRD §7 "Manage user roles").
drop policy if exists users_insert_admin on public.users;
create policy users_insert_admin on public.users
  for insert
  with check (public.app_role() = 'admin'::public.app_role);

drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update
  using (public.app_role() = 'admin'::public.app_role)
  with check (public.app_role() = 'admin'::public.app_role);

------------------------------------------------------------------------------
-- members — own household read; privileged read all; editors write
------------------------------------------------------------------------------
drop policy if exists members_select_own_household on public.members;
create policy members_select_own_household on public.members
  for select
  using (household_id = public.caller_household_id());

drop policy if exists members_select_privileged on public.members;
create policy members_select_privileged on public.members
  for select
  using (public.is_privileged_reader());

-- A member may edit their own linked member row (PRD §7 "Edit own profile").
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members
  for update
  using (id = (select u.member_id from public.users u where u.id = auth.uid()))
  with check (id = (select u.member_id from public.users u where u.id = auth.uid()));

drop policy if exists members_insert_editor on public.members;
create policy members_insert_editor on public.members
  for insert
  with check (public.is_member_editor());

drop policy if exists members_update_editor on public.members;
create policy members_update_editor on public.members
  for update
  using (public.is_member_editor())
  with check (public.is_member_editor());

------------------------------------------------------------------------------
-- households — own household read; privileged read all; editors write
------------------------------------------------------------------------------
drop policy if exists households_select_own on public.households;
create policy households_select_own on public.households
  for select
  using (id = public.caller_household_id());

drop policy if exists households_select_privileged on public.households;
create policy households_select_privileged on public.households
  for select
  using (public.is_privileged_reader());

drop policy if exists households_insert_editor on public.households;
create policy households_insert_editor on public.households
  for insert
  with check (public.is_member_editor());

drop policy if exists households_update_editor on public.households;
create policy households_update_editor on public.households
  for update
  using (public.is_member_editor())
  with check (public.is_member_editor());

commit;
