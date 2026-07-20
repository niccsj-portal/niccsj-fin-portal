-- 20260626100000__roles_enum_and_helper.sql
-- Sprint 1 story 1.2 — app role enum + public.app_role() helper.
--
-- References:
--   * PRD §4.1   role list
--   * PRD §7     roles & permissions matrix
--   * technology.md §6.2  `public.app_role()` returns the caller's role
--
-- This migration introduces the canonical `app_role` enum and converts the
-- text `users.role` column (created schema-only in story 1.1) to use it. It
-- also adds the `public.app_role()` helper that every RLS policy in story 1.3
-- relies on. Keeping the enum + helper in their own migration means the
-- policies (1.3) can assume both already exist.

begin;

------------------------------------------------------------------------------
-- app_role enum (PRD §4.1 / technology.md §6.2)
------------------------------------------------------------------------------
-- Order matches the PRD role list. New roles append to the end so existing
-- stored values keep their ordinal positions.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'member',
      'fin_secretary',
      'treasurer',
      'group_fin_sec',
      'chaplain',
      'finance_council',
      'admin'
    );
  end if;
end
$$;

------------------------------------------------------------------------------
-- Convert public.users.role text -> public.app_role
------------------------------------------------------------------------------
-- Drop the text default first, change the type with an explicit cast, then
-- restore the default as the enum value. Any pre-existing rows must already
-- hold one of the seven valid strings (the dev project has none yet).
alter table public.users alter column role drop default;

alter table public.users
  alter column role type public.app_role
  using role::public.app_role;

alter table public.users
  alter column role set default 'member'::public.app_role;

------------------------------------------------------------------------------
-- public.app_role() — caller's role from public.users (technology.md §6.2)
------------------------------------------------------------------------------
-- Lives in the public schema: Supabase reserves the `auth` schema for the
-- GoTrue service and the migration role may not create objects there
-- (SQLSTATE 42501). A function named app_role() coexists with the app_role
-- enum because PostgreSQL keeps functions (pg_proc) and types (pg_type) in
-- separate catalogs.
-- SECURITY DEFINER so the function can read public.users regardless of the
-- caller's own RLS visibility; STABLE because it does not mutate state and
-- returns the same value within a statement. search_path is pinned to avoid
-- search-path injection (OWASP A03).
create or replace function public.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.role
  from public.users u
  where u.id = auth.uid();
$$;

comment on function public.app_role() is
  'Returns the app_role of the currently authenticated user (technology.md §6.2). Used by every RLS policy.';

revoke all on function public.app_role() from public;
grant execute on function public.app_role() to authenticated;

commit;
