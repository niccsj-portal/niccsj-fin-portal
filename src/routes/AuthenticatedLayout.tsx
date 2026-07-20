import { useNavigate, Outlet } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { SessionTimeoutWarning } from '@/components/layout/SessionTimeoutWarning';
import { useAuth } from '@/lib/auth/AuthContext';
import { ORG_FULL_NAME, ORG_SHORT_NAME } from '@/lib/brand';

/**
 * Layout for all authenticated routes (backlog 1.8). Renders the role-aware
 * AppShell around the routed page (`<Outlet />`), wires the top-bar sign-out,
 * and mounts the idle session-timeout warning (story 1.9).
 */
export function AuthenticatedLayout() {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      orgShortName={ORG_SHORT_NAME}
      orgFullName={ORG_FULL_NAME}
      role={role}
      onSignOut={handleSignOut}
    >
      <Outlet />
      <SessionTimeoutWarning onTimeout={handleSignOut} />
    </AppShell>
  );
}
