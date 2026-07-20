import { useAuth } from '@/lib/auth/AuthContext';
import { roleLabel } from '@/lib/auth/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberDashboard } from '@/routes/member/MemberDashboard';

/**
 * Authenticated landing page (backlog 1.8). Members get the self-service home
 * (story 3.1); other roles see a simple welcome surface until their
 * role-specific dashboards land (treasurer: Sprint 7, etc.).
 */
export function DashboardPage() {
  const { role } = useAuth();

  if (role === 'member') {
    return <MemberDashboard />;
  }

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-display font-semibold text-brand-900">Welcome</h1>
      <p className="mt-2 text-body text-ink-700">
        You're signed in as <strong>{roleLabel(role) || 'a portal user'}</strong>.
      </p>

      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle>Your dashboard is taking shape</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-body-sm text-muted-foreground">
          <p>
            Authentication and role-aware navigation are live. The data-rich views for your role
            arrive in upcoming sprints.
          </p>
          <p>Use the navigation to explore the sections available to you.</p>
        </CardContent>
      </Card>
    </div>
  );
}
