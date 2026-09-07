-- 20260906120000__sub_account_member_dues.sql
-- Sprint 6 follow-up — tie group dues to a member, scope categories per group.
--
-- Why:
--   * PRD §4.5   a Group Financial Secretary records group income; when the
--                income is *dues* it belongs to a specific member, so that
--                member can see the due applied to them (member-facing view).
--   * PRD §7     a Group FS should only see their own group's categories.
--
-- What this migration adds:
--   1. sub_account_transactions.member_id — optional FK to members; set when a
--      dues payment is attributed to a specific member.
--   2. sub_account_categories — maps which categories each group may record
--      against (CMO → CMO Dues + Donations, CWO → CWO Dues + Donations).
--   3. caller_member_id() — the member id linked to the authenticated user
--      (mirrors caller_household_id() from migration 20260626101000).
--   4. RLS so a member can read the sub-account dues attributed to them.
--
-- Conventions (PRD §6.3): no hard deletes on financial rows; RLS is the real
-- authorization boundary; search_path pinned on SECURITY DEFINER helpers.

begin;

------------------------------------------------------------------------------
-- caller_member_id() — the member the authenticated caller is linked to
------------------------------------------------------------------------------
-- SECURITY DEFINER so it can resolve users -> members regardless of the
-- caller's own RLS visibility; STABLE; search_path pinned (OWASP A03). Returns
-- NULL for a caller with no linked member, which makes member-scoped policies
-- fail closed.
create or replace function public.caller_member_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.member_id
  from public.users u
  where u.id = auth.uid();
$$;

comment on function public.caller_member_id() is
  'Returns the member id linked to the authenticated caller (via users.member_id). Member-self primitive (PRD §7).';

revoke all on function public.caller_member_id() from public;
grant execute on function public.caller_member_id() to authenticated;

------------------------------------------------------------------------------
-- sub_account_transactions.member_id — attribute a dues payment to a member
------------------------------------------------------------------------------
-- on delete set null: a member row is never hard-deleted (PRD §6.3), but if one
-- ever is, the ledger entry (a financial record) must survive.
alter table public.sub_account_transactions
  add column if not exists member_id uuid references public.members(id) on delete set null;

create index if not exists sub_account_transactions_member_idx
  on public.sub_account_transactions (member_id);

------------------------------------------------------------------------------
-- sub_account_categories — which categories a group may record against
------------------------------------------------------------------------------
create table if not exists public.sub_account_categories (
    id              uuid primary key default gen_random_uuid(),
    sub_account_id  uuid not null references public.sub_accounts(id) on delete cascade,
    category_id     uuid not null references public.categories(id) on delete cascade,
    created_at      timestamptz not null default now(),
    unique (sub_account_id, category_id)
);

comment on table public.sub_account_categories is
    'Maps categories a sub-account (group) may record against. Scopes the Group FS category picker (PRD §7).';

create index if not exists sub_account_categories_account_idx
    on public.sub_account_categories (sub_account_id);
create index if not exists sub_account_categories_category_idx
    on public.sub_account_categories (category_id);

------------------------------------------------------------------------------
-- Row Level Security — sub_account_categories
------------------------------------------------------------------------------
alter table public.sub_account_categories enable row level security;

-- Read: any authenticated user may read the mapping (category names are not
-- sensitive; the Group FS picker needs it and overseers read rollups).
drop policy if exists sub_account_categories_select on public.sub_account_categories;
create policy sub_account_categories_select on public.sub_account_categories
  for select
  to authenticated
  using (true);

-- Write: Admin maintains the mapping (Sprint 9 admin UI).
drop policy if exists sub_account_categories_insert_admin on public.sub_account_categories;
create policy sub_account_categories_insert_admin on public.sub_account_categories
  for insert
  to authenticated
  with check (public.app_role() = 'admin'::public.app_role);

drop policy if exists sub_account_categories_delete_admin on public.sub_account_categories;
create policy sub_account_categories_delete_admin on public.sub_account_categories
  for delete
  to authenticated
  using (public.app_role() = 'admin'::public.app_role);

------------------------------------------------------------------------------
-- Row Level Security — let a member read the dues attributed to them
------------------------------------------------------------------------------
-- A member is neither an overseer nor an assigned Group FS, so the existing
-- policies return nothing for them. These two policies open exactly the rows a
-- member needs for the member-facing "group dues" view — their own attributed
-- transactions, and the parent sub-account so the group name can be shown.
drop policy if exists sub_account_transactions_select_own_member on public.sub_account_transactions;
create policy sub_account_transactions_select_own_member on public.sub_account_transactions
  for select
  to authenticated
  using (member_id = public.caller_member_id());

drop policy if exists sub_accounts_select_member_dues on public.sub_accounts;
create policy sub_accounts_select_member_dues on public.sub_accounts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sub_account_transactions t
      where t.sub_account_id = sub_accounts.id
        and t.member_id = public.caller_member_id()
    )
  );

------------------------------------------------------------------------------
-- Seed the default category mapping (idempotent via the unique constraint).
------------------------------------------------------------------------------
-- Each group records its own dues plus shared Donations. Name-based join keeps
-- the seed stable across environments (ids are generated).
insert into public.sub_account_categories (sub_account_id, category_id)
select sa.id, c.id
from public.sub_accounts sa
join public.categories c
  on (sa.slug = 'cmo' and c.name in ('CMO Dues', 'Donations') and c.type = 'income')
  or (sa.slug = 'cwo' and c.name in ('CWO Dues', 'Donations') and c.type = 'income')
on conflict (sub_account_id, category_id) do nothing;

commit;
