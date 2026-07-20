import type { Plugin } from 'vite';

/**
 * Strict Content Security Policy for the production SPA bundle.
 *
 * Why each directive is here (see docs/technology.md §9):
 *
 *  - `default-src 'self'`             Deny-by-default; everything else opts in.
 *  - `script-src 'self'`              Only first-party bundled JS. No inline,
 *                                     no eval. Vite's prod build emits no
 *                                     inline scripts, so this stays clean.
 *  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
 *                                     `'unsafe-inline'` is required because
 *                                     Radix / Sonner inject runtime styles
 *                                     (positioning, focus rings). The Google
 *                                     Fonts stylesheet is fetched from
 *                                     fonts.googleapis.com (graphics §4).
 *  - `font-src 'self' https://fonts.gstatic.com data:`
 *                                     Inter + Source Serif 4 ship from
 *                                     fonts.gstatic.com. `data:` covers any
 *                                     base64-encoded glyph subsets.
 *  - `img-src 'self' data: blob: https://*.supabase.co`
 *                                     `'self'` for /brand/*. `data:` because
 *                                     our generated logo.svg / favicon.svg
 *                                     embed PNGs as data URIs (graphics §7.2).
 *                                     `blob:` for client-side file previews.
 *                                     `https://*.supabase.co` for receipts and
 *                                     FS signature signed-URLs (PRD §4.4, §4.10).
 *  - `connect-src 'self' https://*.supabase.co wss://*.supabase.co`
 *                                     Supabase REST + Realtime websockets.
 *  - `frame-ancestors 'none'`         Clickjacking defence. (Browsers ignore
 *                                     this from a <meta> tag; included so it
 *                                     is honoured the day a custom domain +
 *                                     Cloudflare turn it into a real header.)
 *  - `base-uri 'self'`                Prevent <base> injection.
 *  - `form-action 'self'`             Forms post nowhere else (we don't even
 *                                     use HTML form submission — fetch only).
 *  - `object-src 'none'`              No Flash / legacy plugins.
 *  - `upgrade-insecure-requests`      Auto-upgrade any stray http://.
 *
 * Limitations of meta-tag CSP (vs. an HTTP header):
 *  - `frame-ancestors`, `report-uri`, `report-to`, and the sandbox directive
 *    are silently ignored by browsers. They are documented here so a future
 *    Cloudflare-fronted custom domain (PM.md AR-3, post-v1) can promote them
 *    to real response headers without re-deriving the policy.
 */
export const BUILD_CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
];

/** Single-line CSP string suitable for the `content=""` attribute. */
export function buildCspContent(directives: readonly string[] = BUILD_CSP_DIRECTIVES): string {
  return directives.join('; ');
}

/**
 * Inject a strict CSP `<meta http-equiv="Content-Security-Policy">` tag
 * immediately after the document's `<title>`. Idempotent — re-running on
 * already-injected HTML returns the input unchanged.
 */
export function injectCspMeta(html: string, content: string = buildCspContent()): string {
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    return html;
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${content}" />`;
  return html.replace('</title>', `</title>\n    ${meta}`);
}

/**
 * Vite plugin that injects the strict CSP into `index.html` at **build time
 * only**. Dev/HMR is intentionally left alone (HMR uses ws:// and inline
 * runtime scripts that would otherwise be blocked).
 */
export function strictCspPlugin(): Plugin {
  return {
    name: 'niccsj-strict-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return injectCspMeta(html);
      },
    },
  };
}
