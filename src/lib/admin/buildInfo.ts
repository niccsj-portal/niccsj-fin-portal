/**
 * Build/version metadata surfaced on the Admin health page (Sprint 9 story
 * 9.4). Values are injected at build time by the deploy workflow via `VITE_*`
 * env vars; sensible fallbacks keep local dev and tests readable.
 */
export interface BuildInfo {
  /** Short commit SHA (7 chars) or the raw value / 'development'. */
  commitSha: string;
  /** ISO build timestamp, or null when unknown (local dev). */
  buildTime: string | null;
  /** Last recorded DB backup date (ISO), or null when not recorded. */
  lastBackup: string | null;
}

export function getBuildInfo(): BuildInfo {
  const rawSha = import.meta.env.VITE_COMMIT_SHA?.trim();
  const buildTime = import.meta.env.VITE_BUILD_TIME?.trim() || null;
  const lastBackup = import.meta.env.VITE_LAST_BACKUP?.trim() || null;
  return {
    commitSha: rawSha ? rawSha.slice(0, 7) : 'development',
    buildTime,
    lastBackup,
  };
}
