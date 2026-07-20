import type { TranslationResource } from './en';

/**
 * Igbo placeholder bundle (PRD §4.8 — Localization). A small set of confident,
 * genuine Igbo translations is provided so the language switch is demonstrable;
 * every other key intentionally falls back to English via i18next
 * `fallbackLng`. This bundle is expected to be completed with community review
 * in a later sprint. Typed as a deep-partial of the English resource so keys
 * stay in sync with the source of truth.
 */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};

export const ig: DeepPartial<TranslationResource> = {
  lang: {
    en: 'Bekee',
    ig: 'Igbo',
  },
  chrome: {
    signOut: 'Pụọ',
  },
  nav: {
    home: 'Ụlọ',
  },
  dashboard: {
    welcome: 'Nnọọ',
    welcomeNamed: 'Nnọọ, {{name}}',
    householdLabel: 'Ezinụlọ gị:',
  },
};
