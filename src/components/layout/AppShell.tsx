import { useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { LeftNav } from '@/components/layout/LeftNav';
import { TopBar } from '@/components/layout/TopBar';
import { roleLabel, type AppRole } from '@/lib/auth/roles';

/**
 * Top-level application shell (backlog 0.10 / 1.8, UX §4.1, gfx §8.9).
 *
 * Composes the persistent top bar, the 240 px left navigation (visible at
 * `md+` and collapsible to a drawer below `md`), and the main content slot.
 * The left nav and role badge are role-aware (story 1.8); `onSignOut`, when
 * provided, renders a sign-out control in the top bar.
 */
interface AppShellProps {
  children: ReactNode;
  orgShortName?: string;
  orgFullName?: string;
  role?: AppRole | null;
  onSignOut?: () => void;
}

export function AppShell({ children, orgShortName, orgFullName, role, onSignOut }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-50">
      <TopBar
        orgShortName={orgShortName}
        orgFullName={orgFullName}
        role={roleLabel(role) || undefined}
        onMenuClick={() => setDrawerOpen(true)}
        onSignOut={onSignOut}
      />

      <div className="flex">
        {/* Persistent sidebar — md and up. */}
        <aside
          aria-label="Primary navigation"
          className="hidden w-60 shrink-0 border-r border-line-200 bg-surface-0 md:block"
        >
          <LeftNav role={role} />
        </aside>

        {/* Mobile drawer — below md. */}
        <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden"
            />
            <DialogPrimitive.Content
              aria-label="Primary navigation"
              className="fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-line-200 bg-surface-0 shadow-pop data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
            >
              <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Use the links to move between sections.
              </DialogPrimitive.Description>
              <LeftNav role={role} onNavigate={() => setDrawerOpen(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
