-- 20260626102000__audit_trigger_framework.sql
-- Sprint 1 story 1.4 — generic audit-log trigger framework.
--
-- References:
--   * PRD §5     auditability NFR
--   * PRD §6.3   audit_log shape (created in story 1.1)
--   * technology.md §7  every financial mutation writes to audit_log
--
-- Provides:
--   1. public.audit_trigger()        — generic row trigger that records a
--      before/after JSON snapshot of any table it is attached to.
--   2. public.attach_audit_trigger() — helper to (re)attach the trigger to a
--      table by name, so future migrations (contributions in Sprint 4,
--      expenses in Sprint 5, …) opt in with a single call.
--
-- The trigger function is SECURITY DEFINER so its INSERT into audit_log
-- bypasses audit_log's own RLS (story 1.10 keeps that table admin-read only,
-- with no client INSERT policy — writes come exclusively from this trigger).

begin;

------------------------------------------------------------------------------
-- Generic audit trigger
------------------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before    jsonb;
  v_after     jsonb;
  v_entity_id text;
begin
  if (tg_op = 'DELETE') then
    v_before    := to_jsonb(old);
    v_after     := null;
    v_entity_id := (to_jsonb(old) ->> 'id');
  elsif (tg_op = 'UPDATE') then
    v_before    := to_jsonb(old);
    v_after     := to_jsonb(new);
    v_entity_id := (to_jsonb(new) ->> 'id');
  else -- INSERT
    v_before    := null;
    v_after     := to_jsonb(new);
    v_entity_id := (to_jsonb(new) ->> 'id');
  end if;

  insert into public.audit_log (user_id, action, entity, entity_id, before, after)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id, v_before, v_after);

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.audit_trigger() is
  'Generic AFTER row trigger: writes a before/after JSON snapshot to audit_log (PRD §5).';

------------------------------------------------------------------------------
-- Attach helper
------------------------------------------------------------------------------
create or replace function public.attach_audit_trigger(target regclass)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists audit_trigger on %s;', target);
  execute format(
    'create trigger audit_trigger
       after insert or update or delete on %s
       for each row execute function public.audit_trigger();',
    target);
end;
$$;

comment on function public.attach_audit_trigger(regclass) is
  'Attaches the generic audit_trigger to a table. Call once per audited table.';

------------------------------------------------------------------------------
-- Attach to the tables that exist today (members, households, users).
-- Financial tables (contributions, expenses, sub-account txns) attach in
-- their own sprints once created.
------------------------------------------------------------------------------
select public.attach_audit_trigger('public.members');
select public.attach_audit_trigger('public.households');
select public.attach_audit_trigger('public.users');

commit;
