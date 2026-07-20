import { render, screen, fireEvent } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { describe, it, expect } from 'vitest';

import { LanguageSelector } from '@/components/layout/LanguageSelector';
import i18n from '@/i18n';

/**
 * Story 3.4 — language selector wired to react-i18next. Toggling the selector
 * calls i18n.changeLanguage, which re-renders every translated string. The Igbo
 * bundle is a partial placeholder that falls back to English for missing keys.
 */

/** Tiny probe that renders a translated, Igbo-overridden string. */
function WelcomeProbe() {
  const { t } = useTranslation();
  return <span data-testid="welcome">{t('dashboard.welcome')}</span>;
}

describe('LanguageSelector (i18n)', () => {
  it('defaults to English and toggles to Igbo, updating translated strings', async () => {
    render(
      <>
        <LanguageSelector />
        <WelcomeProbe />
      </>,
    );

    // English by default.
    const button = screen.getByRole('button', { name: /language: english/i });
    expect(button).toHaveTextContent(/english/i);
    expect(screen.getByTestId('welcome')).toHaveTextContent('Welcome');

    // Switch to Igbo.
    fireEvent.click(button);

    expect(
      await screen.findByRole('button', { name: /language: igbo/i }),
    ).toHaveTextContent(/igbo/i);
    // The Igbo bundle overrides this key.
    expect(screen.getByTestId('welcome')).toHaveTextContent('Nnọọ');

    // Toggling again returns to English.
    fireEvent.click(screen.getByRole('button', { name: /language: igbo/i }));
    expect(
      await screen.findByRole('button', { name: /language: english/i }),
    ).toHaveTextContent(/english/i);
  });

  it('falls back to English for keys missing from the Igbo bundle', async () => {
    await i18n.changeLanguage('ig');
    // `dashboard.recent` has no Igbo override, so it falls back to English.
    expect(i18n.t('dashboard.recent')).toBe('Recent contributions');
    // `dashboard.welcome` is overridden in Igbo.
    expect(i18n.t('dashboard.welcome')).toBe('Nnọọ');
  });
});
