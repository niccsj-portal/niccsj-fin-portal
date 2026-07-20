import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { ig } from './ig';

/**
 * i18next initialization (PRD §4.8 — Localization; technology.md §11).
 *
 * English is the default and the fallback; Igbo is a partial placeholder bundle
 * that falls back to English for any missing key. Initialized once at module
 * load so importing this module anywhere (app entry or test setup) guarantees a
 * ready instance for `useTranslation`.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ig', name: 'Igbo' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ig: { translation: ig },
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ig'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
