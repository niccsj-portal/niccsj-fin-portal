import type { AppRole } from '@/lib/auth/roles';

/**
 * Shared types for the Admin Console data layer (Sprint 9; PRD §4.11).
 */

/** A row of `public.users` as the Admin Console reads it. */
export interface AdminUserRow {
  id: string;
  email: string;
  role: AppRole;
  member_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A row of `public.audit_log` (append-only; PRD §5). */
export interface AuditLogRow {
  id: number;
  user_id: string | null;
  action: 'insert' | 'update' | 'delete';
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: string;
}

export interface AuditLogFilters {
  userId?: string | null;
  entity?: string | null;
  action?: AuditLogRow['action'] | null;
  /** Inclusive lower bound (ISO date, e.g. 2026-01-01). */
  from?: string | null;
  /** Inclusive upper bound (ISO date). */
  to?: string | null;
}

/** A row of `public.categories` (PRD §4.3). */
export interface CategoryRow {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A row of `public.sub_accounts` (PRD §4.5). */
export interface SubAccountRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A row of `public.sub_account_users` — a Group FS ↔ sub-account assignment. */
export interface SubAccountUserRow {
  id: string;
  sub_account_id: string;
  user_id: string;
  created_at: string;
}
