import { useAuth } from '@/lib/auth/AuthContext';
import { canViewAllContributions } from '@/lib/auth/roles';
import { FamilyContributionsPage } from '@/routes/member/FamilyContributionsPage';
import { ContributionsLedgerPage } from '@/routes/contributions/ContributionsLedgerPage';

/**
 * `/contributions` landing. Privileged readers (Financial Secretary, Treasurer,
 * Chaplain, Admin) get the admin ledger with full per-member visibility;
 * everyone else (member, group FS, finance council) gets the read-only family
 * view, scoped to their own household by RLS (PRD §7).
 */
export function ContributionsPage() {
  const { role } = useAuth();

  if (canViewAllContributions(role)) {
    return <ContributionsLedgerPage />;
  }

  return <FamilyContributionsPage />;
}
