/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Supabase project URL (anon-key client). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anonymous key (safe for the browser; RLS is the boundary). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Git commit SHA injected by the deploy workflow (Sprint 9 health page). */
  readonly VITE_COMMIT_SHA?: string;
  /** ISO build timestamp injected at build time (Sprint 9 health page). */
  readonly VITE_BUILD_TIME?: string;
  /** Last successful DB backup date (ISO), set from the backup runbook. */
  readonly VITE_LAST_BACKUP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
