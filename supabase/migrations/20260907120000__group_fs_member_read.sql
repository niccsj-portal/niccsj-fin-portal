-- 20260907120000__group_fs_member_read.sql
-- Follow-up to sub-account member dues — let a Group FS read members/households.
--
-- Why:
--   A Group Financial Secretary attributes group dues to a specific member
--   (migration 20260906120000). To pick that member — and to offer household /
--   member suggestions on the payee field — the Sub-Account Manager form reads
--   the members + households tables. But `is_privileged_reader()` (migration
--   20260626101000) covers only FS/Treasurer/Chaplain/Admin, and a Group FS is
--   usually not linked to a household, so both reads returned zero rows and the
--   member picker rendered empty.
--
-- Scope (PRD §7): this grants a Group FS SELECT on members + households ONLY
-- (names/numbers needed to attribute dues). It deliberately does NOT touch the
-- contributions ledger policy — a Group FS still cannot see church-wide giving.

begin;

------------------------------------------------------------------------------
-- Predicate — the group-scoped Sub-Account manager role (PRD §4.5)
------------------------------------------------------------------------------
create or replace function public.is_sub_account_manager()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.app_role() = 'group_fin_sec'::public.app_role;
$$;

comment on function public.is_sub_account_manager() is
  'True when the caller is a Group Financial Secretary (sub-account manager). PRD §4.5/§7.';

revoke all on function public.is_sub_account_manager() from public;
grant execute on function public.is_sub_account_manager() to authenticated;

------------------------------------------------------------------------------
-- Additive SELECT policies — a Group FS may read member + household names
------------------------------------------------------------------------------
-- Permissive (OR'd) policies: this only widens read for group_fin_sec and does
-- not affect any other role's existing access.
drop policy if exists members_select_sub_account_manager on public.members;
create policy members_select_sub_account_manager on public.members
  for select
  to authenticated
  using (public.is_sub_account_manager());

drop policy if exists households_select_sub_account_manager on public.households;
create policy households_select_sub_account_manager on public.households
  for select
  to authenticated
  using (public.is_sub_account_manager());

commit;
