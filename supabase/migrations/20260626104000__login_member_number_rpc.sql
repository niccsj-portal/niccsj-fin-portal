-- 20260626104000__login_member_number_rpc.sql
-- Sprint 1 story 1.5 — server-side member-number → email resolution.
--
-- References:
--   * PRD §4.1  "Login by email or member number (member-number login
--                resolves to the user's email server-side)."
--
-- The login form classifies the typed identifier (src/lib/auth/validation.ts);
-- when it is a member number the SPA calls this RPC to obtain the email, then
-- performs a normal password sign-in. The function is SECURITY DEFINER so an
-- unauthenticated visitor can resolve the email despite RLS — it returns ONLY
-- the email for an active member/user and nothing else. Password is still
-- required to actually sign in, so this is a deliberate, minimal disclosure
-- for a small known community (PRD §4.2, ~78 members).

begin;

create or replace function public.email_for_member_number(p_member_number integer)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.email
  from public.members m
  join public.users u on u.member_id = m.id
  where m.member_number = p_member_number
    and m.is_active
    and u.is_active
  limit 1;
$$;

comment on function public.email_for_member_number(integer) is
  'Resolves an active member number to its login email (PRD §4.1). SECURITY DEFINER; password still required to authenticate.';

-- Anonymous visitors need this during login; authenticated callers may also use it.
revoke all on function public.email_for_member_number(integer) from public;
grant execute on function public.email_for_member_number(integer) to anon, authenticated;

commit;
