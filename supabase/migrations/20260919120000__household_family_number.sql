-- 20260919120000__household_family_number.sql
-- Sprint 10 follow-up — first-class Family Number on households.
--
-- Why:
--   * PRD §4.2  The community's legacy paper roster numbers *families*, not
--               individuals ("S/N 1 — Aidan & Celine Ogamba & Family"). Members
--               already quote that number when they donate, so it must be a
--               real, searchable, printable field — not a substring of
--               households.name. `members.member_number` stays the internal
--               per-person roster id and is unchanged.
--   * PRD §4.3  contributions.household_id is NOT NULL — the household is
--               already the donation unit, so the family number is the natural
--               lookup key on the contribution entry form.
--   * PRD §4.6  the End-of-Year summary is issued per household and should
--               print the number the donor recognises.
--
-- Owner decision (2026-09-19): family numbers are **never reused**. A family
-- that leaves keeps its number permanently, so historical annual summaries
-- always resolve to the correct family. That makes a plain UNIQUE constraint
-- correct — no partial index or reuse-after-deactivation logic.
--
-- Nullable on purpose: existing rows (and any household created before the
-- roster import) have no number yet. The admin UI suggests the next value via
-- next_family_number(); the unique constraint is the real guard.

begin;

------------------------------------------------------------------------------
-- households.family_number — the community-facing family identifier
------------------------------------------------------------------------------
alter table public.households
    add column if not exists family_number integer;

comment on column public.households.family_number is
    'Legacy community Family S/N (PRD §4.2). Unique and never reused; null until assigned. Distinct from members.member_number, which numbers individuals.';

-- Unique, not partial: Postgres treats NULLs as distinct, so unassigned
-- households coexist freely while assigned numbers can never collide.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'households_family_number_unique'
    ) then
        alter table public.households
            add constraint households_family_number_unique unique (family_number);
    end if;
end
$$;

create index if not exists households_family_number_idx
    on public.households (family_number);

------------------------------------------------------------------------------
-- next_family_number() — suggests the next sequential family number
------------------------------------------------------------------------------
-- Mirrors next_member_number() (migration 20260626110000). SECURITY DEFINER so
-- MAX() spans every row regardless of the caller's RLS view — a non-privileged
-- caller would otherwise undercount and collide with the unique constraint.
create or replace function public.next_family_number()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce(max(family_number), 0) + 1 from public.households;
$$;

comment on function public.next_family_number() is
    'Suggests the next sequential household family_number (max+1). PRD §4.2.';

revoke all on function public.next_family_number() from public;
grant execute on function public.next_family_number() to authenticated;

commit;
