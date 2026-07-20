import { describe, it, expect } from 'vitest';

import { BUILD_CSP_DIRECTIVES, buildCspContent, injectCspMeta } from '../lib/csp';

describe('BUILD_CSP_DIRECTIVES', () => {
  it('denies by default with default-src self', () => {
    expect(BUILD_CSP_DIRECTIVES).toContain("default-src 'self'");
  });

  it('restricts script-src to self (no inline, no eval)', () => {
    const script = BUILD_CSP_DIRECTIVES.find((d) => d.startsWith('script-src'));
    expect(script).toBe("script-src 'self'");
    expect(script).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it('allows the Google Fonts stylesheet only via fonts.googleapis.com', () => {
    const style = BUILD_CSP_DIRECTIVES.find((d) => d.startsWith('style-src'));
    expect(style).toContain('https://fonts.googleapis.com');
  });

  it('allows fonts only from fonts.gstatic.com and data: URIs', () => {
    const font = BUILD_CSP_DIRECTIVES.find((d) => d.startsWith('font-src'));
    expect(font).toContain('https://fonts.gstatic.com');
    expect(font).toContain('data:');
  });

  it('allows Supabase storage images and own/data/blob image sources', () => {
    const img = BUILD_CSP_DIRECTIVES.find((d) => d.startsWith('img-src'));
    expect(img).toContain("'self'");
    expect(img).toContain('data:');
    expect(img).toContain('blob:');
    expect(img).toContain('https://*.supabase.co');
  });

  it('allows Supabase REST + Realtime websockets in connect-src', () => {
    const connect = BUILD_CSP_DIRECTIVES.find((d) => d.startsWith('connect-src'));
    expect(connect).toContain('https://*.supabase.co');
    expect(connect).toContain('wss://*.supabase.co');
  });

  it('hardens framing, base, forms, and plugins', () => {
    expect(BUILD_CSP_DIRECTIVES).toContain("frame-ancestors 'none'");
    expect(BUILD_CSP_DIRECTIVES).toContain("base-uri 'self'");
    expect(BUILD_CSP_DIRECTIVES).toContain("form-action 'self'");
    expect(BUILD_CSP_DIRECTIVES).toContain("object-src 'none'");
    expect(BUILD_CSP_DIRECTIVES).toContain('upgrade-insecure-requests');
  });
});

describe('buildCspContent', () => {
  it('joins directives with "; " separator', () => {
    const content = buildCspContent(['a', 'b', 'c']);
    expect(content).toBe('a; b; c');
  });
});

describe('injectCspMeta', () => {
  const baseHtml = `<!doctype html><html><head><title>App</title></head><body></body></html>`;

  it('inserts the CSP meta after the document title', () => {
    const out = injectCspMeta(baseHtml, "default-src 'self'");
    expect(out).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'self'" />`,
    );
    // Meta must appear after </title>, not before.
    expect(out.indexOf('</title>')).toBeLessThan(out.indexOf('Content-Security-Policy'));
  });

  it('is idempotent — re-injection leaves the HTML unchanged', () => {
    const once = injectCspMeta(baseHtml);
    const twice = injectCspMeta(once);
    expect(twice).toBe(once);
  });
});
