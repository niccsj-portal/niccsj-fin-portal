/**
 * Contribution + category row types (PRD §4.3, §6.3 data model). These mirror
 * the Postgres schema from the Sprint 4 migrations
 * (`20260628140000__contributions_and_categories.sql` +
 *  `20260628150000__contribution_correction_reason.sql`).
 * Dates are ISO strings as returned by PostgREST; `amount` is a number.
 */

export type PaymentMethod = 'cash' | 'check' | 'zelle' | 'card' | 'other';
export type CategoryType = 'income' | 'expense';

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'cash',
  'check',
  'zelle',
  'card',
  'other',
];

export interface CategoryRow {
  id: string;
  name: string;
  type: CategoryType;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContributionRow {
  id: string;
  member_id: string | null;
  household_id: string;
  contribution_date: string;
  amount: number;
  category_id: string;
  payment_method: PaymentMethod;
  notes: string | null;
  correction_reason: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the Add Contribution form owns (created_by/updated_by are trigger-set). */
export interface ContributionInput {
  member_id: string | null;
  household_id: string;
  contribution_date: string;
  amount: number;
  category_id: string;
  payment_method: PaymentMethod;
  notes: string | null;
}

/** Partial update payload for corrections (story 4.5). */
export interface ContributionUpdate extends Partial<ContributionInput> {
  correction_reason?: string | null;
}

export interface NewCategoryInput {
  name: string;
  type: CategoryType;
  parent_id: string | null;
}

export interface ListContributionsFilters {
  householdId?: string | null;
  memberId?: string | null;
  categoryId?: string | null;
  /** When true (default) only active (non-voided) rows are returned. */
  activeOnly?: boolean;
}
