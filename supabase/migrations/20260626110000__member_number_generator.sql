-- 20260626110000__member_number_generator.sql
-- Sprint 2 story 2.1 — sequential member_number generator + baptism_status.
--
-- References:
--   * PRD §4.2  member_number is a unique sequential int continuing 1..78;
--               admin may override the auto-suggested next value.
--   * PRD §4.2  member profile includes optional baptism status.
--   * backlog §4.3 story 2.1.
--
-- The unique constraint members_member_number_unique (story 1.1) is the real
-- guard against duplicates; this function only *suggests* the next value so
-- the create-member form can pre-fill it. A manual override remains possible
-- because the column is a plain integer.

begin;

------------------------------------------------------------------------------
-- members.baptism_status (optional) — PRD §4.2 profile field.
------------------------------------------------------------------------------
alter table public.members
    add column if not exists baptism_status text
        check (baptism_status in ('baptized', 'not_baptized', 'unknown'));

comment on column public.members.baptism_status is
    'Optional sacramental status. PRD §4.2. Null = not recorded.';

------------------------------------------------------------------------------
-- next_member_number() — suggests the next sequential member number.
------------------------------------------------------------------------------
-- SECURITY DEFINER so the MAX() is computed over every row regardless of the
-- caller's RLS view (a non-privileged caller would otherwise undercount and
-- collide with the unique constraint). STABLE: no writes, safe to inline.
create or replace function public.next_member_number()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce(max(member_number), 0) + 1 from public.members;
$$;

comment on function public.next_member_number() is
    'Suggests the next sequential member_number (max+1). PRD §4.2 story 2.1.';

-- Only signed-in admin/FS users build member records, but the suggestion is
-- harmless; grant to authenticated and revoke from anon.
revoke all on function public.next_member_number() from public;
grant execute on function public.next_member_number() to authenticated;

commit;
