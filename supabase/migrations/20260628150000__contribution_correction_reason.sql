-- 20260628150000__contribution_correction_reason.sql
-- Sprint 4 story 4.5 — record a reason when an existing contribution is
-- corrected, so the change is explained and visible in the audit trail.
--
-- References:
--   * PRD §4.3   "Audit log: who entered/edited, when."
--   * PRD §6.3   no hard deletes on financial rows — corrections are edits.
--   * backlog §4.5 story 4.5
--
-- The reason lives on the row itself (rather than only in audit_log) so it is
-- readable by the recorders who make corrections (FS / Treasurer), who do NOT
-- have audit_log read access (PRD §7 — audit log is admin-only). Because it is
-- a column, the AFTER audit trigger (story 1.4) still captures it in the
-- before/after snapshot automatically.

begin;

alter table public.contributions
    add column if not exists correction_reason text;

comment on column public.contributions.correction_reason is
    'Why the entry was last corrected (PRD §4.3). Null = never corrected.';

commit;
