-- 20260703170000__signatures_storage.sql
-- Sprint 8 story 8.1 — private Storage bucket for the Financial Secretary
-- signature image, with strict RLS, plus a narrow self-update policy on
-- public.users so an FS can point at their own uploaded signature.
--
-- References:
--   * PRD §4.10  Financial Secretary signature management (upload/replace/remove)
--   * PRD §6.3   private Storage + short-lived signed URLs only
--   * PRD §7     only the FS (own signature) + Admin (recovery) may touch it
--   * backlog §4.9 / PM.md §5H stories 8.1 + 8.2
--   * graphics.md §11  the signature block on the End-of-Year summary
--
-- Design notes:
--   * The `public.users.fin_sec_signature_path` column already exists (initial
--     schema 20260619140000) — this migration does NOT re-add it. It only wires
--     the Storage bucket, the object-level RLS, and a column-safe self-update
--     policy.
--   * Path convention: `<user_id>/signature.png`. RLS scopes every object to
--     its owning user via `(storage.foldername(name))[1] = auth.uid()::text`,
--     with Admin allowed everywhere for recovery. Only the Financial Secretary
--     and Admin roles may write.
--   * The bucket is PRIVATE. The SPA mints short-lived signed URLs for preview;
--     the `generate-annual-summary` Edge Function reads the bytes with the
--     service role at render time.

begin;

------------------------------------------------------------------------------
-- 1. Private bucket
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

------------------------------------------------------------------------------
-- 2. Object-level RLS (FS-owner + Admin only)
--    storage.objects already has RLS enabled by Supabase; we add scoped
--    policies for the `signatures` bucket. A caller only ever sees / writes
--    objects under their own `<uid>/` prefix unless they are Admin.
------------------------------------------------------------------------------
drop policy if exists signatures_select_owner_or_admin on storage.objects;
create policy signatures_select_owner_or_admin on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'signatures'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.app_role() = 'admin'::public.app_role
    )
  );

drop policy if exists signatures_insert_owner_or_admin on storage.objects;
create policy signatures_insert_owner_or_admin on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'signatures'
    and public.app_role() in ('fin_secretary'::public.app_role, 'admin'::public.app_role)
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.app_role() = 'admin'::public.app_role
    )
  );

drop policy if exists signatures_update_owner_or_admin on storage.objects;
create policy signatures_update_owner_or_admin on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'signatures'
    and public.app_role() in ('fin_secretary'::public.app_role, 'admin'::public.app_role)
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.app_role() = 'admin'::public.app_role
    )
  )
  with check (
    bucket_id = 'signatures'
    and public.app_role() in ('fin_secretary'::public.app_role, 'admin'::public.app_role)
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.app_role() = 'admin'::public.app_role
    )
  );

drop policy if exists signatures_delete_owner_or_admin on storage.objects;
create policy signatures_delete_owner_or_admin on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'signatures'
    and public.app_role() in ('fin_secretary'::public.app_role, 'admin'::public.app_role)
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.app_role() = 'admin'::public.app_role
    )
  );

------------------------------------------------------------------------------
-- 3. Column-safe self-update on public.users
--    The existing policy set only lets Admins UPDATE users (role management).
--    An FS must be able to set / clear their OWN `fin_sec_signature_path`
--    without being able to change their role, email, member link, or active
--    flag. RLS cannot restrict columns directly, so the WITH CHECK freezes
--    every sensitive column to its current value via a self-subquery; only
--    `fin_sec_signature_path` (and the `updated_at` stamp) may differ.
------------------------------------------------------------------------------
drop policy if exists users_update_own_signature on public.users;
create policy users_update_own_signature on public.users
  for update
  to authenticated
  using (
    id = auth.uid()
    and public.app_role() in ('fin_secretary'::public.app_role, 'admin'::public.app_role)
  )
  with check (
    id = auth.uid()
    and public.app_role() in ('fin_secretary'::public.app_role, 'admin'::public.app_role)
    and role      = (select u.role      from public.users u where u.id = auth.uid())
    and email     = (select u.email     from public.users u where u.id = auth.uid())
    and member_id is not distinct from (select u.member_id from public.users u where u.id = auth.uid())
    and is_active = (select u.is_active from public.users u where u.id = auth.uid())
  );

comment on policy users_update_own_signature on public.users is
  'Sprint 8.1 — lets an FS/Admin set only their own fin_sec_signature_path; '
  'role/email/member_id/is_active are frozen to current values (PRD §4.10, §7).';

commit;
