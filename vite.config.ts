/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

import { strictCspPlugin } from './src/lib/csp';

// GitHub Pages serves the site under `/<repo>/` for project pages; the
// deploy workflow passes the correct value via the BASE_PATH env var.
// Local dev and previews default to `/`.
const basePath = process.env.BASE_PATH ?? '/';

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react(), strictCspPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
