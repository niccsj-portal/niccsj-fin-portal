import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

import i18n from '@/i18n';

// Keep i18n initialized for every test and reset to English before each test so
// language changes in one test never leak into the next.
beforeEach(() => {
  if (i18n.language !== 'en') {
    void i18n.changeLanguage('en');
  }
});
