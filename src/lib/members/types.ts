/**
 * Member + household row types (PRD §6.3 data model). These mirror the
 * Postgres schema from the Sprint 1 initial migration plus the Sprint 2
 * `baptism_status` column. Dates are ISO strings as returned by PostgREST.
 */

export type RoleInHousehold = 'head' | 'spouse' | 'child';
export type BaptismStatus = 'baptized' | 'not_baptized' | 'unknown';
export type MemberStatusFilter = 'all' | 'active' | 'inactive';

export interface MemberRow {
  id: string;
  member_number: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  joined_date: string;
  household_id: string | null;
  role_in_household: RoleInHousehold | null;
  baptism_status: BaptismStatus | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HouseholdRow {
  id: string;
  name: string;
  primary_member_id: string | null;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

/** Fields the create/edit member form owns. */
export interface MemberInput {
  member_number: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  joined_date: string;
  household_id: string | null;
  role_in_household: RoleInHousehold | null;
  baptism_status: BaptismStatus | null;
  is_active: boolean;
}

export interface HouseholdInput {
  name: string;
  primary_member_id: string | null;
}

export interface ListMembersFilters {
  status?: MemberStatusFilter;
  householdId?: string | null;
}
