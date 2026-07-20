import type { MemberRow } from '@/lib/members/types';

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
