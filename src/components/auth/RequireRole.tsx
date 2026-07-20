import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth/AuthContext';
import { canAccessNav, type AppRole } from '@/lib/auth/roles';
import { AccessDeniedPage } from '@/routes/AccessDeniedPage';

/**
 * Gate for role-restricted routes (PRD §7, UX §4.4). Pass either the nav
 * `navKey` that owns the route, or an `allow` predicate for finer-grained
 * permissions (e.g. member-editor-only sub-routes). If the current role is
 * not permitted we render the friendly "Access denied" page.
 *
 * This is presentation-layer defence-in-depth only — Postgres RLS remains the
 * authoritative boundary (technology.md §6.2).
 */
export function RequireRole({
  navKey,
  allow,
  children,
}: {
  navKey?: string;
  allow?: (role: AppRole | null) => boolean;
  children: ReactNode;
}) {
  const { role } = useAuth();

  const permitted = allow ? allow(role) : navKey ? canAccessNav(role, navKey) : false;

  if (!permitted) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
