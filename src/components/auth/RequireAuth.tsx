import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Gate for authenticated-only routes (PRD §4.1). While the session is
 * resolving we render a lightweight loading state; unauthenticated users are
 * redirected to /login, preserving the attempted path for post-login return.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center text-body text-ink-700"
      >
        Loading your session…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
