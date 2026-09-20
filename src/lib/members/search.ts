import type { HouseholdRow, MemberRow } from '@/lib/members/types';

/**
 * Client-side free-text search over the (small, ~78-row) member roster. Matches
 * member number, first/last/full name, or email. Server-side status/household
 * filters narrow the set first; this just refines what is already loaded.
 */
export function memberMatchesSearch(member: MemberRow, raw: string): boolean {
  const term = raw.trim().toLowerCase();
  if (!term) return true;
  const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
  return (
    String(member.member_number).includes(term) ||
    member.first_name.toLowerCase().includes(term) ||
    member.last_name.toLowerCase().includes(term) ||
    fullName.includes(term) ||
    (member.email?.toLowerCase().includes(term) ?? false)
  );
}

/**
 * Display label for a household: "12 — Ogamba (Aidan & Celine)". The family
 * number leads because that is the identifier the community quotes when
 * donating (PRD §4.2); the name disambiguates same-surname families.
 */
export function householdLabel(household: HouseholdRow): string {
  return household.family_number == null
    ? household.name
    : `${household.family_number} — ${household.name}`;
}

/**
 * Free-text search over households. The family number matches **exactly** —
 * the FS is keying an identifier off a donation, so typing "1" must not also
 * offer families 10–19. Names still match as substrings.
 */
export function householdMatchesSearch(household: HouseholdRow, raw: string): boolean {
  const term = raw.trim().toLowerCase();
  if (!term) return true;
  if (household.family_number != null && String(household.family_number) === term) return true;
  return household.name.toLowerCase().includes(term);
}

/** Orders households by family number (numerically), unnumbered last by name. */
export function compareHouseholdsByFamilyNumber(a: HouseholdRow, b: HouseholdRow): number {
  if (a.family_number != null && b.family_number != null) {
    return a.family_number - b.family_number;
  }
  if (a.family_number != null) return -1;
  if (b.family_number != null) return 1;
  return a.name.localeCompare(b.name);
}
