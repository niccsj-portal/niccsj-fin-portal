import type { ReactNode } from 'react';

import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { ORG_FULL_NAME, ORG_SHORT_NAME } from '@/lib/brand';

const LOGO_SRC = `${import.meta.env.BASE_URL}brand/logo.svg`;
const LOGO_ON_DARK_SRC = `${import.meta.env.BASE_URL}brand/logo-on-dark.png`;

/**
 * Centered card layout for the unauthenticated auth screens — login, forgot
 * password, set new password (gfx §8.10). Renders a full-width brand top bar
 * (logo + org name + language selector), the brand logo, the gold rule, a
 * heading + optional subheading, and the form slot. The language selector sits
 * in the top bar so the choice is available before sign-in (PRD §4.8).
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-brand-900 px-3 text-surface-0 md:px-6">
        <span className="flex items-center gap-3">
          <img src={LOGO_ON_DARK_SRC} alt="" width={32} height={32} className="h-8 w-auto" />
          <span className="hidden font-serif text-h2 font-semibold sm:inline xl:hidden">
            {ORG_SHORT_NAME}
          </span>
          <span className="hidden font-serif text-h2 font-semibold xl:inline">
            {ORG_FULL_NAME}
          </span>
        </span>
        <div className="ml-auto flex items-center">
          <LanguageSelector />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 md:items-center md:pt-0">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={LOGO_SRC} alt="NICC-SJ" className="h-12 w-auto" />
            <div className="rule-gold my-4 w-16" aria-hidden="true" />
            <h1 className="font-serif text-h1 font-semibold text-brand-900">{title}</h1>
            {subtitle ? <p className="mt-2 text-body-sm text-ink-700">{subtitle}</p> : null}
          </div>

          {children}

          {footer ? <div className="mt-6 text-center text-body-sm">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
