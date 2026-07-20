/**
 * Brand asset build script.
 *
 * Reads two true-vector source SVGs in `public/brand/` and produces all
 * derivatives required by docs/graphics.md §7.2:
 *
 *   Sources (committed, hand-supplied):
 *     logo_new.svg     Primary wordmark for light backgrounds (dark fill).
 *     logo_new1.svg    Inverse variant for dark backgrounds (white fill).
 *
 *   Outputs in `public/brand/`:
 *     logo.svg              Copy of the primary vector source.
 *     logo-512.png          512 px wide PNG, aspect-preserving (graphics.md
 *                           §7.2 allows "512 × 512 or proportional").
 *     logo-256.png          256 px wide PNG, aspect-preserving.
 *     logo-on-dark.png      256 px wide PNG rendered from the inverse SVG so
 *                           the artwork sits cleanly on the brand-900 band.
 *     favicon.svg           Copy of the primary vector source.
 *     favicon.ico           Multi-resolution ICO (16 / 32 / 48), square
 *                           contain on transparent background.
 *     apple-touch-icon.png  180 × 180 PNG, square contain on transparent.
 *
 * Re-run with:  npm run brand
 */

import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'public', 'brand');

// Vector sources live alongside the derived outputs so they are versioned
// with the rest of the brand pack.
const primarySource = path.join(outDir, 'logo_new.svg');
const onDarkSource = path.join(outDir, 'logo_new1.svg');

async function ensureOutDir() {
  await mkdir(outDir, { recursive: true });
}

/**
 * Load an SVG source as a sharp pipeline. `density` controls the rasterisation
 * DPI; sharp picks a sensible render size from the SVG's intrinsic viewBox,
 * and a higher density keeps strokes crisp at larger output sizes.
 */
async function loadSvg(sourcePath, density = 384) {
  const svg = await readFile(sourcePath);
  return sharp(svg, { density });
}

/**
 * Render an SVG to a PNG of a given pixel width, preserving the source's
 * native aspect ratio. Output is always RGBA on a fully transparent canvas.
 */
async function proportionalPng(sourcePath, width) {
  const pipeline = await loadSvg(sourcePath, Math.max(192, width));
  return pipeline
    .resize({ width, fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Render an SVG into a square canvas of `size` px, contained with transparent
 * letterboxing. Used for favicons and the Apple touch icon, which must be
 * square even when the source artwork is a wide wordmark.
 */
async function squarePng(sourcePath, size) {
  const pipeline = await loadSvg(sourcePath, Math.max(192, size * 4));
  return pipeline
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writeProportionalPng(sourcePath, width, filename) {
  const buf = await proportionalPng(sourcePath, width);
  await writeFile(path.join(outDir, filename), buf);
}

async function writeSquarePng(sourcePath, size, filename) {
  const buf = await squarePng(sourcePath, size);
  await writeFile(path.join(outDir, filename), buf);
}

async function copySvg(sourcePath, filename) {
  await copyFile(sourcePath, path.join(outDir, filename));
}

async function buildFaviconIco() {
  // Multi-resolution ICO bundles 16/32/48 for crisp browser-tab rendering.
  // The wordmark is wide, so each entry is contained on a transparent square.
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((s) => squarePng(primarySource, s)));
  const ico = await pngToIco(pngs);
  await writeFile(path.join(outDir, 'favicon.ico'), ico);
}

async function main() {
  await ensureOutDir();

  await Promise.all([
    // Vector outputs are exact copies of the hand-supplied sources.
    copySvg(primarySource, 'logo.svg'),
    copySvg(primarySource, 'favicon.svg'),
    // Aspect-preserving raster derivatives of the primary wordmark.
    writeProportionalPng(primarySource, 512, 'logo-512.png'),
    writeProportionalPng(primarySource, 256, 'logo-256.png'),
    // Inverse variant for the brand-900 top bar.
    writeProportionalPng(onDarkSource, 256, 'logo-on-dark.png'),
    // Square Apple touch icon.
    writeSquarePng(primarySource, 180, 'apple-touch-icon.png'),
  ]);

  await buildFaviconIco();

  console.log(`✓ Brand assets written to ${path.relative(repoRoot, outDir)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
