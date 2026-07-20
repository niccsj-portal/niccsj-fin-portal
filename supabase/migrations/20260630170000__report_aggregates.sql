-- 20260630170000__report_aggregates.sql
-- Sprint 7 story 7.2 — aggregate-only reporting RPCs for the Finance Council.
--
-- References:
--   * PRD §4.6   reports + Council oversight dashboard
--   * PRD §7     the Finance Council sees AGGREGATE figures only — never a
--                per-member or per-household row
--   * backlog §4.8 / PM.md §5G stories 7.2 + 7.5
--
-- Why this migration exists:
--   Row Level Security on `public.contributions` (migration 20260628140000)
--   exposes rows only to a member's own household or to `is_privileged_reader()`
--   (FS / Treasurer / Chaplain / Admin). The Finance Council is NOT a privileged
--   reader, so it cannot — and must not — receive contribution rows. But the
--   Council DOES need aggregate income / participation / category figures.
--
--   These SECURITY DEFINER functions are the sanctioned bridge: they compute
--   totals inside the database and return ONLY aggregate rows (sums + counts,
--   with a category name at most). No member_id, household_id, note, date, or
--   amount for an individual entry ever leaves the function. Each is gated to
--   `is_expense_reader()` — the leadership set (FS / Treasurer / Chaplain /
--   Finance Council / Admin) — and returns an empty set to anyone else, so a
--   member or Group FS gains nothing by calling them directly.
--
-- Conventions (asserted by src/test/migrations.sprint7.test.ts):
--   * SECURITY DEFINER + `set search_path = public, pg_temp`
--   * caller gate via `public.is_expense_reader()`
--   * execute granted to `authenticated` only (revoked from public)

begin;

------------------------------------------------------------------------------
-- report_income_by_category — per-category income totals for a date range.
-- Aggregate-only: one row per category with a summed amount; no entry detail.
------------------------------------------------------------------------------
create or replace function public.report_income_by_category(
  p_start date,
  p_end date
)
returns table (category_id uuid, category_name text, total numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_expense_reader() then
    return;
  end if;
  return query
    select c.category_id, cat.name, sum(c.amount)::numeric
    from public.contributions c
    join public.categories cat on cat.id = c.category_id
    where c.is_active
      and c.contribution_date between p_start and p_end
    group by c.category_id, cat.name
    order by sum(c.amount) desc;
end;
$$;

revoke all on function public.report_income_by_category(date, date) from public;
grant execute on function public.report_income_by_category(date, date) to authenticated;

------------------------------------------------------------------------------
-- report_income_monthly — 12-bucket income trend for a calendar year.
-- Aggregate-only: one row per month that has income, with a summed amount.
------------------------------------------------------------------------------
create or replace function public.report_income_monthly(p_year integer)
returns table (month integer, total numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_expense_reader() then
    return;
  end if;
  return query
    select extract(month from c.contribution_date)::integer, sum(c.amount)::numeric
    from public.contributions c
    where c.is_active
      and extract(year from c.contribution_date) = p_year
    group by extract(month from c.contribution_date)
    order by extract(month from c.contribution_date);
end;
$$;

revoke all on function public.report_income_monthly(integer) from public;
grant execute on function public.report_income_monthly(integer) to authenticated;

------------------------------------------------------------------------------
-- report_participation — how many households gave in a date range, of the total.
-- Aggregate-only: two counts. No household is named.
------------------------------------------------------------------------------
create or replace function public.report_participation(
  p_start date,
  p_end date
)
returns table (contributing integer, total integer)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_expense_reader() then
    return;
  end if;
  return query
    select
      (
        select count(distinct c.household_id)
        from public.contributions c
        where c.is_active
          and c.household_id is not null
          and c.contribution_date between p_start and p_end
      )::integer,
      (
        select count(*)
        from public.households h
        where h.is_active
      )::integer;
end;
$$;

revoke all on function public.report_participation(date, date) from public;
grant execute on function public.report_participation(date, date) to authenticated;

commit;
