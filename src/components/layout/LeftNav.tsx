import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { navItemsForRole } from '@/lib/auth/roles';
import type { AppRole } from '@/lib/auth/roles';

/**
 * Primary navigation (backlog 1.8: "nav items show/hide by role").
 *
 * The visible items are filtered by the caller's role via `navItemsForRole`
 * (mirroring the PRD §7 matrix). Active styling follows gfx §8.9. Routes are
 * still guarded by RequireRole and, server-side, by RLS.
 */
interface LeftNavProps {
  role: AppRole | null | undefined;
  /** Called when a nav item is activated; used by the mobile drawer to close. */
  onNavigate?: () => void;
}

export function LeftNav({ role, onNavigate }: LeftNavProps) {
  const { t } = useTranslation();
  const items = navItemsForRole(role);

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.key}
            to={item.path}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              cn(
                'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-body-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-100 text-brand-900 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-accent-600'
                  : 'text-ink-700 hover:bg-brand-50 hover:text-brand-900',
              )
            }
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t(`nav.${item.key}`, item.label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
