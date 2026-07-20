import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

/**
 * Language selector (backlog 0.10 / 3.4, gfx §8.9 / §12; PRD §4.8).
 *
 * Wired to react-i18next: clicking cycles through the supported languages and
 * calls `i18n.changeLanguage`, which re-renders every translated string in the
 * app. The visible label and aria-label are themselves translated so they read
 * in the active language.
 */
export function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const current = (SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)
    ?.code ?? 'en') as LanguageCode;
  const currentIndex = SUPPORTED_LANGUAGES.findIndex((l) => l.code === current);
  const next = SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length];

  const currentName = t(`lang.${current}`);

  const handleClick = () => {
    void i18n.changeLanguage(next.code);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="text-surface-0 hover:bg-brand-700 hover:text-surface-0"
      aria-label={t('chrome.languageAria', { name: currentName })}
    >
      <Globe aria-hidden="true" />
      <span>{currentName}</span>
    </Button>
  );
}
