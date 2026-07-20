import { LogOut, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { RoleBadge } from '@/components/layout/RoleBadge';

/**
 * Top bar (backlog 0.10 / 1.8, gfx §8.9).
 *
 * - 56 px tall, brand-900 background, full-bleed.
 * - Logo at far left (32 px tall, logo-on-dark.png) from /brand/.
 * - Optional organization short name beside it (hidden below md).
 * - Role badge slot on the right (accent-600 text on brand-700 chip).
 * - Language selector skeleton next to the badge.
 * - Optional sign-out control (story 1.8) when `onSignOut` is provided.
 * - Hamburger button (shown below md) opens the left-nav drawer.
 */
interface TopBarProps {
  orgShortName?: string;
  orgFullName?: string;
  role?: string;
  onMenuClick: () => void;
  onSignOut?: () => void;
}

const LOGO_SRC = `${import.meta.env.BASE_URL}brand/logo-on-dark.png`;

export function TopBar({ orgShortName, orgFullName, role, onMenuClick, onSignOut }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-brand-900 px-3 text-surface-0 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="md:hidden text-surface-0 hover:bg-brand-700 hover:text-surface-0"
      >
        <Menu aria-hidden="true" />
      </Button>

      <a href="#" className="flex items-center gap-3" aria-label="Home">
        <img src={LOGO_SRC} alt="" width={32} height={32} className="h-8 w-auto" />
        {orgShortName ? (
          <span
            className={`hidden font-serif text-h2 font-semibold md:inline${
              orgFullName ? ' xl:hidden' : ''
            }`}
          >
            {orgShortName}
          </span>
        ) : null}
        {orgFullName ? (
          <span className="hidden font-serif text-h2 font-semibold xl:inline">
            {orgFullName}
          </span>
        ) : null}
      </a>

      <div className="ml-auto flex items-center gap-2">
        <RoleBadge role={role} />
        <LanguageSelector />
        {onSignOut ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            aria-label={t('chrome.signOut')}
            className="text-surface-0 hover:bg-brand-700 hover:text-surface-0"
          >
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">{t('chrome.signOut')}</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
