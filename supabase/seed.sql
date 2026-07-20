-- supabase/seed.sql
-- Dev-only seed (PM.md AR-14, owner pre-approved). DO NOT run against prod.
--
-- Creates one login per app role for the Sprint 1 demo so each role can sign
-- in and verify role-aware navigation + RLS. Passwords are a single shared dev
-- secret that the OWNER must rotate immediately after first login. Emails use
-- the reserved `.test` TLD so they can never collect real mail.
--
-- How to run (owner, against the DEV project only):
--   * Supabase Studio -> SQL Editor -> paste this file -> Run, OR
--   * psql "$DEV_DB_URL" -f supabase/seed.sql
--
-- Safe to re-run: each user is created only if its email is absent.
--
-- NOTE: This inserts directly into auth.users / auth.identities. The column
-- set below matches current Supabase GoTrue. If a future GoTrue migration
-- changes required columns, create the users via Studio -> Authentication
-- instead and keep only the public.users INSERTs.

begin;

------------------------------------------------------------------------------
-- Helper: create an auth user + identity + public.users profile row.
------------------------------------------------------------------------------
create or replace function public._dev_seed_user(
  p_email text,
  p_password text,
  p_role public.app_role
)
returns uuid
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = p_email;
  if v_uid is not null then
    return v_uid;
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_uid, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
    '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(), v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', p_email),
    'email', now(), now(), now()
  );

  insert into public.users (id, email, role)
  values (v_uid, p_email, p_role)
  on conflict (id) do update set role = excluded.role;

  return v_uid;
end;
$$;

------------------------------------------------------------------------------
-- Seed users — one per role (group_fin_sec twice: CMO + CWO).
-- Shared dev password; OWNER must rotate after first login.
------------------------------------------------------------------------------
do $$
declare
  v_pwd        text := 'DevPass!2026-change-me';
  v_member_uid uuid;
  v_household  uuid;
  v_member     uuid;
begin
  -- Privileged + oversight roles.
  perform public._dev_seed_user('dev+admin@niccsj.test',     v_pwd, 'admin');
  perform public._dev_seed_user('dev+fs@niccsj.test',        v_pwd, 'fin_secretary');
  perform public._dev_seed_user('dev+treasurer@niccsj.test', v_pwd, 'treasurer');
  perform public._dev_seed_user('dev+cmo@niccsj.test',       v_pwd, 'group_fin_sec');
  perform public._dev_seed_user('dev+cwo@niccsj.test',       v_pwd, 'group_fin_sec');
  perform public._dev_seed_user('dev+chaplain@niccsj.test',  v_pwd, 'chaplain');
  perform public._dev_seed_user('dev+council@niccsj.test',   v_pwd, 'finance_council');

  -- A plain member, wired to a household + member row so the household-scoped
  -- RLS policies (members_select_own_household) are demoable.
  v_member_uid := public._dev_seed_user('dev+member@niccsj.test', v_pwd, 'member');

  if not exists (select 1 from public.members where member_number = 1) then
    insert into public.households (name) values ('Dev Test Household')
      returning id into v_household;

    insert into public.members (member_number, first_name, last_name, email, household_id, role_in_household)
    values (1, 'Dev', 'Member', 'dev+member@niccsj.test', v_household, 'head')
      returning id into v_member;

    update public.households set primary_member_id = v_member where id = v_household;
    update public.users set member_id = v_member where id = v_member_uid;
  end if;
end
$$;

------------------------------------------------------------------------------
-- Tidy up the helper so it is not left behind in the dev database.
------------------------------------------------------------------------------
drop function if exists public._dev_seed_user(text, text, public.app_role);

commit;
