-- 20260630120000__categories_rls_policies.sql
-- Fix: public.categories had RLS enabled (story 1.1, initial schema) but no
-- policies were ever defined for it. With RLS on and zero policies, every
-- SELECT returns no rows — which is why the Add Contribution form's category
-- dropdown was empty even after the categories were seeded (story 4.1).
--
-- Categories are reference data:
--   * any authenticated user may READ them (the recorder form needs the income
--     list; the member family view needs the names to label its chart/table);
--   * only recorders (FS / Treasurer / Admin) may INSERT/UPDATE — this backs the
--     ad-hoc donation sub-category creation from the form (story 4.3) and future
--     phase-out toggling of the legacy dues category (PRD §4.3, Sprint 9).
--
-- References: PRD §4.3 (categories), §7 (record contribution = FS/Treasurer/Admin).
-- Idempotent: drop policy if exists before create.

begin;

drop policy if exists categories_select_authenticated on public.categories;
create policy categories_select_authenticated on public.categories
  for select
  to authenticated
  using (true);

drop policy if exists categories_insert_recorder on public.categories;
create policy categories_insert_recorder on public.categories
  for insert
  to authenticated
  with check (public.is_contribution_recorder());

drop policy if exists categories_update_recorder on public.categories;
create policy categories_update_recorder on public.categories
  for update
  to authenticated
  using (public.is_contribution_recorder())
  with check (public.is_contribution_recorder());

commit;
