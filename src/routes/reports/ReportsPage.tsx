import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { canViewAllContributions } from '@/lib/auth/roles';
import { CouncilDashboardPage } from '@/routes/reports/CouncilDashboardPage';
import { TreasurerDashboardPage } from '@/routes/reports/TreasurerDashboardPage';

/**
 * Reports entry point (Sprint 7). Branches to the role-appropriate dashboard:
 *   - Finance Council → the aggregate-only oversight dashboard (stories 7.2/7.5);
 *   - privileged finance readers (FS / Treasurer / Chaplain / Admin) → the full
 *     Treasurer finance dashboard (story 7.1);
 *   - Group Financial Secretary → a pointer to their Sub-accounts page, where
 *     their group's reporting lives (they oversee only their own group, not the
 *     org-wide ledgers). RLS remains the authoritative boundary either way.
 */
export function ReportsPage() {
  const { role } = useAuth();

  if (role === 'finance_council') {
    return <CouncilDashboardPage />;
  }

  if (canViewAllContributions(role)) {
    return <TreasurerDashboardPage />;
  }

  return (
    <div className="max-w-xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Reports</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your reporting lives on the Sub-accounts page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-body-sm text-ink-700">
          <p>
            As a Group Financial Secretary you manage your group's ledger and submit its monthly
            summary from the Sub-accounts area. Organisation-wide reports are limited to the
            Treasurer and Finance Council.
          </p>
          <Button asChild>
            <Link to="/sub-accounts">Go to Sub-accounts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
