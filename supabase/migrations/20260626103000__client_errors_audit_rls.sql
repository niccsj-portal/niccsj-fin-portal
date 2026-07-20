-- 20260626103000__client_errors_audit_rls.sql
-- Sprint 1 story 1.10 — RLS for client_errors (and audit_log read).
--
-- References:
--   * PRD §4.11  client_errors: insert by any authenticated user, admin read
--   * PRD §5     audit_log is admin-readable (Chaplain optional)
--   * src/lib/clientErrorsLogger.ts  the SPA writer this enables end-to-end
--
-- RLS was enabled on both tables in story 1.1; this migration attaches the
-- policies so the React error boundary's insert finally lands server-side.

begin;

------------------------------------------------------------------------------
-- client_errors — any authenticated user may INSERT; only admins may SELECT
------------------------------------------------------------------------------
-- Insert is open to authenticated callers so the boundary can log even for a
-- low-privilege member. user_id is nullable and self-asserted; admins read.
drop policy if exists client_errors_insert_authenticated on public.client_errors;
create policy client_errors_insert_authenticated on public.client_errors
  for insert
  to authenticated
  with check (true);

drop policy if exists client_errors_select_admin on public.client_errors;
create policy client_errors_select_admin on public.client_errors
  for select
  to authenticated
  using (public.app_role() = 'admin'::public.app_role);

------------------------------------------------------------------------------
-- audit_log — admin reads everything; Chaplain optionally reads (PRD §7)
------------------------------------------------------------------------------
-- No INSERT policy: rows are written only by the SECURITY DEFINER
-- audit_trigger() (story 1.4), which bypasses RLS.
drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select
  to authenticated
  using (
    public.app_role() in (
      'admin'::public.app_role,
      'chaplain'::public.app_role
    )
  );

commit;
