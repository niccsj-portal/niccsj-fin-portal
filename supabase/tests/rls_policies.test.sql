-- supabase/tests/rls_policies.test.sql
-- Sprint 9 story 9.7 — pgTAP RLS policy suite covering the PRD §7 matrix.
--
-- WHAT THIS PROVES
--   For every hard boundary in PRD §7 (Roles & Permissions Matrix) this file
--   authenticates as each role and asserts what that role can and cannot read
--   or write — with Postgres Row Level Security as the *authoritative* check
--   (technology.md §6.2). The SPA's `roles.ts` helpers only mirror this.
--
-- HOW TO RUN
--   Option A (canonical) — local pgTAP harness:
--       supabase start            # needs Docker
--       supabase test db          # runs every supabase/tests/*.test.sql
--
--   Option B (no Docker; against the hosted dev DB) — the repo runner:
--       $env:PG_CONNECTION = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
--       npm run test:rls          # prints TAP output, exits non-zero on any "not ok"
--
--   Everything runs inside a single transaction that is ROLLED BACK, so no
--   fixture data ever persists — safe to run against the dev DB.
--
-- NOTES
--   * Requires the pgTAP extension (preinstalled on Supabase; created here if
--     missing) and all migrations already applied.
--   * `tests.login(uid)` sets the JWT `sub` claim so `auth.uid()` / `app_role()`
--     resolve to the impersonated user; `set local role authenticated` engages
--     RLS (the superuser connection would otherwise bypass it).
--   * RLS INSERT/UPDATE denials raise SQLSTATE 42501 — asserted with throws_ok.
--   * Where PRD §7 authority is enforced by an Edge Function rather than RLS
--     alone (e.g. the expense status *transition*), the comment says so and the
--     RLS-level rule is what is asserted here.

begin;

------------------------------------------------------------------------------
-- Harness
------------------------------------------------------------------------------
create extension if not exists pgtap;

-- Make pgTAP callable by the `authenticated` role we switch into below. This
-- grant is scoped to the transaction and rolled back with everything else.
do $$
begin
  begin execute 'grant execute on all functions in schema public to authenticated'; exception when others then null; end;
  begin execute 'grant execute on all functions in schema extensions to authenticated'; exception when others then null; end;
end
$$;

create schema if not exists tests;

-- Impersonate a user: set the JWT sub claim (auth.uid() reads it). Role is
-- switched separately with `set local role authenticated` so RLS applies.
create or replace function tests.login(uid uuid)
returns void
language sql
security invoker
as $$
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text,
    true
  );
$$;
grant usage on schema tests to authenticated;
grant execute on function tests.login(uuid) to authenticated;

------------------------------------------------------------------------------
-- Fixtures (seeded as the superuser connection; RLS not yet engaged)
------------------------------------------------------------------------------
-- auth.users (public.users.id references these). Only the columns the FK and
-- our helpers need are set; the rest are nullable/defaulted in GoTrue's schema.
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rls_member@niccsj.test',    now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rls_fs@niccsj.test',        now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'rls_treasurer@niccsj.test', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'rls_gcmo@niccsj.test',      now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'rls_gcwo@niccsj.test',      now(), now()),
  ('00000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'rls_chaplain@niccsj.test',  now(), now()),
  ('00000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'rls_council@niccsj.test',   now(), now()),
  ('00000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'rls_admin@niccsj.test',     now(), now()),
  ('00000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'rls_target@niccsj.test',    now(), now());

-- households.
insert into public.households (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'RLS Household One'),
  ('00000000-0000-0000-0000-0000000000a2', 'RLS Household Two');

-- members (member user is linked to m_member in h1).
insert into public.members (id, member_number, first_name, last_name, household_id) values
  ('00000000-0000-0000-0000-0000000000b1', 9001, 'Ada', 'One', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2', 9002, 'Obi', 'Two', '00000000-0000-0000-0000-0000000000a2');

-- public.users (role per PRD §4.1). member links to m_member; target is a plain member.
insert into public.users (id, email, role, member_id) values
  ('00000000-0000-0000-0000-000000000001', 'rls_member@niccsj.test',    'member',          '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-000000000002', 'rls_fs@niccsj.test',        'fin_secretary',   null),
  ('00000000-0000-0000-0000-000000000003', 'rls_treasurer@niccsj.test', 'treasurer',       null),
  ('00000000-0000-0000-0000-000000000004', 'rls_gcmo@niccsj.test',      'group_fin_sec',   null),
  ('00000000-0000-0000-0000-000000000005', 'rls_gcwo@niccsj.test',      'group_fin_sec',   null),
  ('00000000-0000-0000-0000-000000000006', 'rls_chaplain@niccsj.test',  'chaplain',        null),
  ('00000000-0000-0000-0000-000000000007', 'rls_council@niccsj.test',   'finance_council', null),
  ('00000000-0000-0000-0000-000000000008', 'rls_admin@niccsj.test',     'admin',           null),
  ('00000000-0000-0000-0000-000000000009', 'rls_target@niccsj.test',    'member',          null);

-- a category to hang contributions / expenses on.
insert into public.categories (id, name, type) values
  ('00000000-0000-0000-0000-0000000000c1', 'RLS Test Income', 'income');

-- contributions: one per household.
insert into public.contributions (id, household_id, member_id, amount, category_id, payment_method) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 50.00, '00000000-0000-0000-0000-0000000000c1', 'cash'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b2', 75.00, '00000000-0000-0000-0000-0000000000c1', 'cash');

-- a pending expense for the reader / approver assertions.
insert into public.expenses (id, category_id, payee, amount, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'RLS Vendor', 120.00, 'pending');

-- two isolated sub-accounts + their assigned Group FS users + one txn each.
insert into public.sub_accounts (id, slug, name) values
  ('00000000-0000-0000-0000-0000000000f1', 'rls_test_cmo', 'RLS Test CMO'),
  ('00000000-0000-0000-0000-0000000000f2', 'rls_test_cwo', 'RLS Test CWO');

insert into public.sub_account_users (sub_account_id, user_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000005');

insert into public.sub_account_transactions (id, sub_account_id, direction, amount, category_id) values
  ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000f1', 'income', 10.00, '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-0000000000f2', 'income', 20.00, '00000000-0000-0000-0000-0000000000c1');

------------------------------------------------------------------------------
-- Engage RLS: from here on we run as `authenticated`, impersonating per test.
------------------------------------------------------------------------------
select no_plan();

set local role authenticated;

-- === members SELECT (PRD §7 "View any member profile") ===================
-- Counts are scoped to the two fixture members so the suite is deterministic
-- even against a populated dev DB (privileged readers also see real rows).
select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select is((select count(*)::int from public.members
  where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2')), 1,
  'member sees only their own household members');

select tests.login('00000000-0000-0000-0000-000000000002'); -- fin_secretary
select is((select count(*)::int from public.members
  where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2')), 2,
  'Financial Secretary (privileged reader) sees every member');

select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
select is((select count(*)::int from public.members
  where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2')), 2,
  'Treasurer (privileged reader) sees every member');

select tests.login('00000000-0000-0000-0000-000000000006'); -- chaplain
select is((select count(*)::int from public.members
  where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2')), 2,
  'Chaplain (privileged reader) sees every member');

select tests.login('00000000-0000-0000-0000-000000000007'); -- finance_council
select is((select count(*)::int from public.members
  where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2')), 0,
  'Finance Council is NOT a per-member reader (sees no member rows)');

select tests.login('00000000-0000-0000-0000-000000000004'); -- group_fin_sec
select is((select count(*)::int from public.members
  where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2')), 0,
  'Group Financial Secretary sees no member rows (no household link)');

-- === members INSERT (PRD §7 "Create/edit member" = FS/Chaplain/Admin) ====
select tests.login('00000000-0000-0000-0000-000000000002'); -- fin_secretary
select lives_ok(
  $$ insert into public.members (member_number, first_name, last_name, household_id)
     values (9110, 'New', 'ByFS', '00000000-0000-0000-0000-0000000000a1') $$,
  'Financial Secretary may create a member');

select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
select throws_ok(
  $$ insert into public.members (member_number, first_name, last_name, household_id)
     values (9111, 'Nope', 'ByTreasurer', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null,
  'Treasurer may NOT create a member (RLS denies)');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select throws_ok(
  $$ insert into public.members (member_number, first_name, last_name, household_id)
     values (9112, 'Nope', 'ByMember', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null,
  'Member may NOT create a member (RLS denies)');

select tests.login('00000000-0000-0000-0000-000000000007'); -- finance_council
select throws_ok(
  $$ insert into public.members (member_number, first_name, last_name, household_id)
     values (9113, 'Nope', 'ByCouncil', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null,
  'Finance Council may NOT create a member (RLS denies)');

-- === users role management (PRD §7 "Manage user roles" = Admin only) ======
-- Treasurer attempts to elevate the target; RLS silently affects zero rows.
select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
update public.users set role = 'admin'::public.app_role
  where id = '00000000-0000-0000-0000-000000000009';
select tests.login('00000000-0000-0000-0000-000000000008'); -- admin (to read back)
select is(
  (select role::text from public.users where id = '00000000-0000-0000-0000-000000000009'),
  'member',
  'Treasurer cannot change another user''s role');

select tests.login('00000000-0000-0000-0000-000000000008'); -- admin
select lives_ok(
  $$ update public.users set role = 'treasurer'::public.app_role
     where id = '00000000-0000-0000-0000-000000000009' $$,
  'Admin may change a user''s role');

-- === contributions SELECT (PRD §7 "View per-member financial details") ====
-- Scoped to the two fixture contributions (one per household).
select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select is((select count(*)::int from public.contributions
  where id in ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d2')), 1,
  'member sees only their own family''s contributions');

select tests.login('00000000-0000-0000-0000-000000000002'); -- fin_secretary
select is((select count(*)::int from public.contributions
  where id in ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d2')), 2,
  'Financial Secretary sees all contributions');

select tests.login('00000000-0000-0000-0000-000000000006'); -- chaplain
select is((select count(*)::int from public.contributions
  where id in ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d2')), 2,
  'Chaplain sees all contributions (per-member visibility)');

select tests.login('00000000-0000-0000-0000-000000000007'); -- finance_council
select is((select count(*)::int from public.contributions
  where id in ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d2')), 0,
  'Finance Council sees NO per-member contribution rows (aggregate-only)');

-- === contributions INSERT (PRD §7 "Record contribution" = FS/Treasurer/Admin)
select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
select lives_ok(
  $$ insert into public.contributions (household_id, amount, category_id, payment_method)
     values ('00000000-0000-0000-0000-0000000000a1', 5.00, '00000000-0000-0000-0000-0000000000c1', 'cash') $$,
  'Treasurer may record a contribution');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select throws_ok(
  $$ insert into public.contributions (household_id, amount, category_id, payment_method)
     values ('00000000-0000-0000-0000-0000000000a1', 5.00, '00000000-0000-0000-0000-0000000000c1', 'cash') $$,
  '42501', null,
  'Member may NOT record a contribution');

select tests.login('00000000-0000-0000-0000-000000000006'); -- chaplain
select throws_ok(
  $$ insert into public.contributions (household_id, amount, category_id, payment_method)
     values ('00000000-0000-0000-0000-0000000000a1', 5.00, '00000000-0000-0000-0000-0000000000c1', 'cash') $$,
  '42501', null,
  'Chaplain may NOT record on the main ledger (reader, not recorder)');

select tests.login('00000000-0000-0000-0000-000000000007'); -- finance_council
select throws_ok(
  $$ insert into public.contributions (household_id, amount, category_id, payment_method)
     values ('00000000-0000-0000-0000-0000000000a1', 5.00, '00000000-0000-0000-0000-0000000000c1', 'cash') $$,
  '42501', null,
  'Finance Council may NOT record a contribution');

-- === expenses SELECT (PRD §7 "Notified of expenses" reader set) ===========
-- Scoped to the fixture expense so pre-existing rows don't skew the count.
select tests.login('00000000-0000-0000-0000-000000000007'); -- finance_council
select is((select count(*)::int from public.expenses
  where id = '00000000-0000-0000-0000-0000000000e1'), 1,
  'Finance Council may read the expense ledger');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select is((select count(*)::int from public.expenses
  where id = '00000000-0000-0000-0000-0000000000e1'), 0,
  'Member may NOT read the expense ledger');

-- === expenses INSERT (PRD §7 "Submit expense" = Treasurer/Admin) ==========
select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
select lives_ok(
  $$ insert into public.expenses (category_id, payee, amount)
     values ('00000000-0000-0000-0000-0000000000c1', 'By Treasurer', 30.00) $$,
  'Treasurer may submit an expense');

select tests.login('00000000-0000-0000-0000-000000000002'); -- fin_secretary
select throws_ok(
  $$ insert into public.expenses (category_id, payee, amount)
     values ('00000000-0000-0000-0000-0000000000c1', 'By FS', 30.00) $$,
  '42501', null,
  'Financial Secretary may NOT submit an expense');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select throws_ok(
  $$ insert into public.expenses (category_id, payee, amount)
     values ('00000000-0000-0000-0000-0000000000c1', 'By Member', 30.00) $$,
  '42501', null,
  'Member may NOT submit an expense');

-- === expenses UPDATE by approver (PRD §7 "Approve / reject expense") =======
-- The status *transition* is owned by the approve/reject Edge Functions; at the
-- RLS layer the approver (Chaplain/Admin) is the role permitted to update.
select tests.login('00000000-0000-0000-0000-000000000006'); -- chaplain
select lives_ok(
  $$ update public.expenses set description = 'reviewed'
     where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'Chaplain (approver) may update an expense');

-- === sub-account transactions: group isolation (PRD §7) ===================
-- Scoped to the two fixture transactions (one CMO, one CWO).
select tests.login('00000000-0000-0000-0000-000000000004'); -- group CMO
select is((select count(*)::int from public.sub_account_transactions
  where id in ('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a02')), 1,
  'Group FS (CMO) sees only their own group''s transactions');

select tests.login('00000000-0000-0000-0000-000000000005'); -- group CWO
select is((select count(*)::int from public.sub_account_transactions
  where id in ('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a02')), 1,
  'Group FS (CWO) sees only their own group''s transactions');

select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer (overseer)
select is((select count(*)::int from public.sub_account_transactions
  where id in ('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a02')), 2,
  'Treasurer (overseer) sees every group''s transactions');

select tests.login('00000000-0000-0000-0000-000000000007'); -- finance_council (overseer)
select is((select count(*)::int from public.sub_account_transactions
  where id in ('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a02')), 2,
  'Finance Council (overseer) sees every group''s transactions');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select is((select count(*)::int from public.sub_account_transactions
  where id in ('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a02')), 0,
  'Member sees no sub-account transactions');

select tests.login('00000000-0000-0000-0000-000000000004'); -- group CMO
select lives_ok(
  $$ insert into public.sub_account_transactions (sub_account_id, direction, amount)
     values ('00000000-0000-0000-0000-0000000000f1', 'income', 1.00) $$,
  'Group FS (CMO) may record into their own group');

select throws_ok(
  $$ insert into public.sub_account_transactions (sub_account_id, direction, amount)
     values ('00000000-0000-0000-0000-0000000000f2', 'income', 1.00) $$,
  '42501', null,
  'Group FS (CMO) may NOT record into another group (CWO)');

-- === audit_log SELECT (PRD §7 "View audit log" = Admin + Chaplain) ========
select tests.login('00000000-0000-0000-0000-000000000008'); -- admin
select ok((select count(*) from public.audit_log) > 0,
  'Admin may read the audit log');

select tests.login('00000000-0000-0000-0000-000000000006'); -- chaplain
select ok((select count(*) from public.audit_log) > 0,
  'Chaplain may read the audit log');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select is((select count(*)::int from public.audit_log), 0,
  'Member may NOT read the audit log');

select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
select is((select count(*)::int from public.audit_log), 0,
  'Treasurer may NOT read the audit log');

-- === sub_account_users assignment (PRD §7 "Manage sub-accounts" = Admin) ===
select tests.login('00000000-0000-0000-0000-000000000008'); -- admin
select lives_ok(
  $$ insert into public.sub_account_users (sub_account_id, user_id)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000009') $$,
  'Admin may assign a Group FS to a sub-account');

select tests.login('00000000-0000-0000-0000-000000000003'); -- treasurer
select throws_ok(
  $$ insert into public.sub_account_users (sub_account_id, user_id)
     values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000009') $$,
  '42501', null,
  'Treasurer may NOT manage sub-account assignments');

-- === categories write (PRD §7 "Manage categories" — recorder RLS) =========
select tests.login('00000000-0000-0000-0000-000000000002'); -- fin_secretary
select lives_ok(
  $$ insert into public.categories (name, type) values ('RLS New Income', 'income') $$,
  'Financial Secretary (recorder) may create a category');

select tests.login('00000000-0000-0000-0000-000000000001'); -- member
select throws_ok(
  $$ insert into public.categories (name, type) values ('RLS Bad Income', 'income') $$,
  '42501', null,
  'Member may NOT create a category');

------------------------------------------------------------------------------
-- Done.
------------------------------------------------------------------------------
reset role;
select * from finish();

rollback;
