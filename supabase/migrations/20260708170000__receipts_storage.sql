-- 20260708170000__receipts_storage.sql
-- Sprint 10 (v1 launch prep) — make the private `receipts` Storage bucket and
-- its object-level RLS reproducible so a fresh PRODUCTION project can be
-- bootstrapped entirely from `supabase/migrations/` (no manual dashboard step).
--
-- Background:
--   The `receipts` bucket was originally created by hand in the dev project
--   during Sprint 5 (story 5.2) and its policies were added in the dashboard,
--   so nothing in the repo recreated them. This migration codifies that intent
--   using the SAME expense predicate helpers the `expenses` table RLS relies on.
--
-- References:
--   * PRD §4.4   expense receipts (private Storage + short-lived signed URLs)
--   * PRD §6.3   private Storage; never a public URL
--   * PRD §7     who may submit vs. read expenses (predicate helpers below)
--   * technology.md §9  signed-URL access only
--   * src/lib/expenses/storage.ts  client surface (upload + createSignedUrl)
--   * migration 20260630140000__expenses_and_notifications.sql  (helper defs)
--
-- Design notes:
--   * The bucket is PRIVATE. Uploads go through `is_expense_recorder()`
--     (Treasurer + Admin); reads (signed-URL minting) go through
--     `is_expense_reader()` (FS + Treasurer + Chaplain + Finance Council +
--     Admin). Both helpers already include Admin, so no separate admin clause
--     is needed.
--   * Object paths are YEAR-namespaced (`<year>/<ts>-<rand>-<file>`), not
--     user-namespaced, so access is role-based (an approver views receipts for
--     expenses they did not submit) — hence no `foldername = auth.uid()` check.
--   * Idempotent: `on conflict (id) do nothing` for the bucket and
--     `drop policy if exists` before each `create policy`, so this is safe to
--     apply to a fresh prod project AND to dev (where a hand-made bucket already
--     exists). NOTE: if dev has manually-named policies, reconcile by dropping
--     those old policies so only these canonical ones remain.

begin;

------------------------------------------------------------------------------
-- 1. Private bucket
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

------------------------------------------------------------------------------
-- 2. Object-level RLS (role-based via the expense predicate helpers).
--    storage.objects already has RLS enabled by Supabase; we add policies
--    scoped to the `receipts` bucket only.
------------------------------------------------------------------------------

-- Read: any expense reader may mint a signed URL for any receipt.
drop policy if exists receipts_select_expense_reader on storage.objects;
create policy receipts_select_expense_reader on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_expense_reader()
  );

-- Write (upload): only expense recorders (Treasurer + Admin) may add receipts.
drop policy if exists receipts_insert_expense_recorder on storage.objects;
create policy receipts_insert_expense_recorder on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_expense_recorder()
  );

-- Update (replace): only expense recorders may replace a receipt object.
drop policy if exists receipts_update_expense_recorder on storage.objects;
create policy receipts_update_expense_recorder on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_expense_recorder()
  )
  with check (
    bucket_id = 'receipts'
    and public.is_expense_recorder()
  );

-- Delete: only expense recorders may remove a receipt object.
drop policy if exists receipts_delete_expense_recorder on storage.objects;
create policy receipts_delete_expense_recorder on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_expense_recorder()
  );

commit;
