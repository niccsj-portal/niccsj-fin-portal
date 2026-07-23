/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

import { strictCspPlugin } from './src/lib/csp';

// GitHub Pages serves the site under `/<repo>/` for project pages; the
// deploy workflow passes the correct value via the BASE_PATH env var.
// `actions/configure-pages` outputs the path WITHOUT a trailing slash
// (e.g. `/niccsj-portal`), but Vite (and every `${BASE_URL}foo/bar` string
// concatenation in the app) expects the trailing slash — otherwise asset
// URLs become `/niccsj-portalbrand/...` at runtime. Normalise here.
// Local dev and previews default to `/`.
const rawBasePath = process.env.BASE_PATH ?? '/';
const basePath = rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`;

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
