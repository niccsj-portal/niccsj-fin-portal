import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Friendly "Access denied" page (backlog 1.8, UX §4.4). Rendered by
 * RequireRole when the current role lacks permission for a route. It explains
 * the situation calmly and offers a route back to the dashboard rather than a
 * dead end.
 */
export function AccessDeniedPage() {
  return (
    <div role="alert" className="mx-auto max-w-md py-12 text-center">
      <ShieldAlert aria-hidden="true" className="mx-auto h-12 w-12 text-accent-600" />
      <h1 className="mt-4 font-serif text-h1 font-semibold text-brand-900">Access denied</h1>
      <p className="mt-2 text-body text-ink-700">
        Your role doesn't have permission to view this page. If you think this is a mistake, please
        contact your administrator.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
