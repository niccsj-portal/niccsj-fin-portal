# Graphical Design Specification

## Project: NICC-SJ Finance & Membership Portal

**Organization:** Nigerian Igbo Catholic Community of San Jose, CA (NICC-SJ)
**Document Version:** 0.2 (Draft — logo + signature requirements added)
**Last Updated:** June 7, 2026
**Source of Truth:** `docs/PRD.md`, `docs/UX.md`, `docs/technology.md`
**Purpose:** Define the visual identity, design tokens, component styling, and graphical patterns that will give the portal a modern, trustworthy, and welcoming look — appropriate for a Catholic, Igbo-American, nonprofit community.

---

## 1. Design Vision

The portal’s visual language should feel:

- **Modern but quiet.** Clean typography, generous whitespace, soft shadows. No flashy gradients, no decorative noise.
- **Trustworthy.** Calm colors, predictable layout, clear hierarchy on financial numbers.
- **Faith-respecting.** Subtle nods to the Catholic and Igbo identity — never loud, never kitschy.
- **Warm and inclusive.** Approachable to grandparents using a phone and to council members on a laptop.
- **Accessible.** WCAG 2.1 AA contrast, large tap targets, no color-only signals.

Design north star: **“A parish bulletin redesigned by a thoughtful 2026 product team.”**

---

## 2. Brand Personality

| Trait | Expressed As |
|---|---|
| Trustworthy | Steady palette, structured layout, transparent status chips |
| Welcoming | Friendly copy, soft corners, warm secondary color |
| Reverent | Restrained gold accent, quiet iconography, white space |
| Inclusive | Clear type, big tap targets, bilingual labels (English/Igbo) |
| Modern | Neutral grays, thin dividers, gentle motion |

---

## 3. Color System

### 3.1 Primary Palette

A deep liturgical blue anchors the brand. Gold is reserved for accents (highlights, key totals). Neutrals carry most of the surface.

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `brand-900` | `#0B2B5C` | `bg-[#0B2B5C]` | Top bar, primary headings on dark |
| `brand-700` | `#1E4A8A` | `bg-[#1E4A8A]` | Primary buttons, active nav |
| `brand-500` | `#3B72C4` | `bg-[#3B72C4]` | Links, focus rings |
| `brand-100` | `#E6EEF9` | `bg-[#E6EEF9]` | Selected row, info backgrounds |
| `accent-600` | `#B98A2C` | `bg-[#B98A2C]` | Reserved gold — totals, key KPI |
| `accent-100` | `#FBF3DD` | `bg-[#FBF3DD]` | Soft highlight strip behind featured KPI |

### 3.2 Neutrals (UI surfaces & text)

| Token | Hex | Usage |
|---|---|---|
| `ink-900` | `#0F172A` | Primary text |
| `ink-700` | `#334155` | Secondary text |
| `ink-500` | `#64748B` | Muted/help text |
| `line-200` | `#E2E8F0` | Dividers, table borders |
| `surface-50` | `#F8FAFC` | Page background |
| `surface-0`  | `#FFFFFF` | Cards, modals |

### 3.3 Semantic / Status

| State | Hex | Usage |
|---|---|---|
| Success | `#15803D` | Approved, paid, balance positive |
| Warning | `#B45309` | Pending, due soon |
| Danger  | `#B91C1C` | Rejected, overdue, destructive action |
| Info    | `#1D4ED8` | Notifications, neutral system messages |

### 3.4 Contrast Rules
- Body text on white: `ink-900` (passes AAA).
- Muted text on white: `ink-500` (passes AA at 14px+).
- Never rely on color alone — every status uses **icon + label + color** (UX §4.5).

---

## 4. Typography

A two-typeface system: a humanist serif for liturgical warmth and a clean sans for UI.

| Role | Family | Where |
|---|---|---|
| Display / Section titles | **Source Serif 4** (Google Fonts) | H1, hero numbers, statement covers |
| UI / Body | **Inter** (Google Fonts) | Everything else |
| Numerals (financial) | **Inter** with `font-feature-settings: "tnum"` (tabular figures) | Tables, balances, totals |

### 4.1 Type Scale (mobile-first, scales up at `md:`)

| Token | Size / Line | Usage |
|---|---|---|
| `display-xl` | 32 / 40 (md: 40 / 48) | Statement covers, marketing headers |
| `display`    | 24 / 32 (md: 30 / 38) | Page titles |
| `h1`         | 20 / 28 | Card headers |
| `h2`         | 18 / 26 | Section titles |
| `body`       | 16 / 24 | Default text |
| `body-sm`    | 14 / 20 | Secondary text |
| `caption`    | 12 / 16 | Labels, helper text |
| `mono`       | 14 / 20 (Inter tabular) | Money, member numbers |

### 4.2 Rules
- Body text **never** smaller than 14 px in production UI.
- All money values use tabular figures so columns align in tables.
- Headlines use **Source Serif 4 Semibold**; body uses **Inter Regular / Medium**; never bold long passages.

---

## 5. Layout & Spacing

### 5.1 Grid
- 12-column responsive grid; max content width **1200 px**.
- Page gutters: 16 px (mobile), 24 px (tablet), 32 px (desktop).
- Vertical rhythm in multiples of **4 px**.

### 5.2 Spacing Tokens (Tailwind scale)

| Token | px | Use |
|---|---|---|
| `space-1` | 4  | Hairline gaps |
| `space-2` | 8  | Inline icon gap |
| `space-3` | 12 | Form field internal padding |
| `space-4` | 16 | Default vertical rhythm |
| `space-6` | 24 | Card padding |
| `space-8` | 32 | Section spacing |
| `space-12` | 48 | Page-level breaks |

### 5.3 Radius & Elevation
- Corner radius scale: `sm` 6 px (chips), `md` 10 px (inputs, buttons), `lg` 14 px (cards), `xl` 20 px (modals, statement covers).
- Shadows: only two levels.
  - `shadow-card`: `0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)`
  - `shadow-pop`: `0 8px 24px rgba(15,23,42,0.10)` — for modals, dropdowns.

### 5.4 Density
- **Comfortable** on member-facing pages (default).
- **Compact** mode toggle on admin tables (Treasurer, Financial Secretary, Group Fin Sec).

---

## 6. Iconography

- **Library:** `lucide-react`. Stroke 1.5 px. 20 px default in UI, 16 px inline with text.
- **Tone:** geometric, line-based, never filled glyphs except for status badges.
- Status icons (always paired with label and color):
  - Pending → `clock`
  - Approved → `check-circle-2`
  - Rejected → `x-circle`
  - Submitted → `send`
  - Overdue → `alert-triangle`
  - Active / Inactive → `circle-dot` / `circle-off`
- Domain icons:
  - Member / Household → `users-round`
  - Contribution → `hand-coins`
  - Expense → `receipt`
  - Sub-account (CMO/CWO) → `wallet`
  - Report → `file-bar-chart`
  - Audit log → `shield-check`
  - Settings → `settings-2`
  - Language → `languages`

---

## 7. Imagery & Iconography of Identity

A modern Catholic, Igbo-American, nonprofit community calls for restraint. We use identity sparingly so it feels reverent, not decorative.

- **Official logo:** the organization's logo is provided at `logo.jpg` in the repository root. This is the **single source of truth** for the brand mark and must appear on:
  - The portal's top navigation bar.
  - The login page.
  - The browser favicon.
  - The Annual / End-of-Year Family Contribution Summary PDF (see §11).
  - Transactional email headers.
- **Photography:** if used, prefer real community photos (with permission), warm tones, soft natural light. No stock imagery of generic people.
- **Illustration:** none in v1. We rely on icons + typography to keep maintenance simple.
- **Patterns:** a single optional decorative element — a thin gold rule (1 px, `accent-600`) above page titles on statement PDFs and the login screen. That is the only flourish.

> Cultural note: avoid loud tribal or liturgical motifs as decorative wallpaper. The visual identity should read as a respectful contemporary parish, not a themed graphic.

### 7.1 Logo Usage Rules

The official logo (`logo.jpg`) is the brand mark. It must always appear with respect for these rules:

- **Source asset:** `logo.jpg` lives at the repository root. Production builds reference a derived asset shipped under `public/brand/` (see §7.2).
- **Clear space:** maintain padding around the logo equal to **at least 25% of the logo's height** on all sides. Nothing (text, edges, dividers) may enter the clear-space zone.
- **Minimum size:**
  - Digital UI: 32 px tall in the top bar; 64 px tall on the login page; 16 px (favicon) at smallest.
  - Print/PDF: 0.6 inch (≈43 px @ 72 dpi) minimum height.
- **Backgrounds:** use the logo only on white (`surface-0`), light neutral (`surface-50`), or the brand dark band (`brand-900`). On `brand-900`, use a white-background variant or a transparent PNG export that reads cleanly against dark navy.
- **Do not:**
  - Stretch, skew, rotate, recolor, or apply drop shadows.
  - Place over busy photography.
  - Use the wordmark “NICC-SJ” as a substitute when the official logo can be shown.
- **Alt text (a11y):** always render the logo with `alt="NICC-SJ — Nigerian Igbo Catholic Community of San Jose"`.

### 7.2 Logo Asset Pipeline

The source `logo.jpg` is a raster image. To support all surfaces (web, retina, PDF, print), we will derive these production assets and store them under `public/brand/`:

| File | Format | Size / Notes |
|---|---|---|
| `logo.svg` | SVG (vector trace of `logo.jpg`) | Preferred for all UI and PDFs. Crisp at any size. |
| `logo-512.png` | PNG, transparent background | 512 × 512 (or proportional). For email headers and fallbacks where SVG is not supported. |
| `logo-256.png` | PNG, transparent background | 256 × 256. For top nav at retina densities. |
| `logo-on-dark.png` | PNG, transparent background, optimized for `brand-900` band | For top bar and email banners on dark. |
| `favicon.ico` | ICO (16/32/48) | Browser tab icon. |
| `favicon.svg` | SVG | Modern browsers. |
| `apple-touch-icon.png` | PNG | 180 × 180. |

> If a vector original of the logo is available later, replace `logo.svg` with the true vector source — an SVG traced from `logo.jpg` is a starting point, not a permanent solution.

---

## 8. Component Visual Specifications

### 8.1 Buttons

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | `brand-700` | white | none | Primary action per page (Save, Submit, Approve) |
| Secondary | white | `brand-700` | 1 px `brand-700` | Secondary action |
| Ghost | transparent | `ink-700` | none | Tertiary / table row actions |
| Destructive | `#B91C1C` | white | none | Delete, Reject |
| Disabled | `surface-50` | `ink-500` | 1 px `line-200` | Disabled state |

- Height: 40 px default, 44 px on mobile (touch target).
- Radius: `md` (10 px).
- Focus ring: 2 px `brand-500` with 2 px offset.

### 8.2 Inputs / Forms
- Height 44 px, radius `md`, 1 px `line-200` border, focus border `brand-500` + soft ring.
- Labels above the input, 14 px, `ink-700`. Helper text 12 px `ink-500`.
- Required marker: small red dot, not just an asterisk color.
- Inline error: red icon + red text + red border.
- Currency input: right-aligned text, prefix `$`, tabular figures, max 2 decimals.

### 8.3 Cards
- Background `surface-0`, border `1 px line-200`, radius `lg`, padding `space-6`.
- Card header: `h2` title left, optional action button right.
- KPI card: large number in tabular figures, label below, optional trend icon + delta.

### 8.4 Tables (Ledgers)
- Sticky header with `surface-50` background and `caption` uppercase labels.
- Row height 44 px; zebra striping **off** by default; rely on row hover (`brand-100`) and dividers.
- Money columns right-aligned, tabular figures.
- Status column always renders the chip pattern (icon + label + color).
- Empty state inside the table area, never a blank screen.

### 8.5 Status Chips
- Pill shape, radius `xl` (full), padding `2 px 10 px`, height 22 px.
- Pattern: small icon + label.
- Backgrounds use the 100-tint of the status color; text uses the 700-shade.

### 8.6 Charts (Recharts)
- Series colors drawn from a 6-color palette built on the brand:
  1. `#1E4A8A` (brand-700)
  2. `#3B72C4` (brand-500)
  3. `#B98A2C` (accent-600)
  4. `#15803D` (success)
  5. `#B45309` (warning)
  6. `#7C3AED` (auxiliary purple, used last)
- Always show grid lines in `line-200`, axis labels in `ink-500`.
- Pair every chart with a small data table or a “View as table” toggle (UX §4.5).
- No 3D, no pie chart for >5 slices — use horizontal bars instead.

### 8.7 Modals & Dialogs
- Centered, max width 480 px (forms) or 720 px (review screens).
- Backdrop: `rgba(15,23,42,0.5)`.
- Close on `Esc`, on backdrop click only when no unsaved changes.

### 8.8 Toasts / Notifications
- Top-right on desktop, top-center on mobile.
- Auto-dismiss after 5 s for success/info; persistent for errors until dismissed.
- Single concise sentence; never stack more than 3.

### 8.9 Navigation
- Top bar height 56 px, `brand-900` background, **official logo at the far left (32 px tall, `logo-on-dark.png` or `logo.svg`)**, organization short name beside it (optional, hidden on mobile), role badge in `accent-600` text on `brand-700` chip on the right.
- Left nav: 240 px wide on desktop, collapses to drawer below `md`.
- Active item: 2 px left bar in `accent-600`, background `brand-100`.

### 8.10 Login & Public Pages
- Centered card on `surface-50` background.
- **Official logo (`logo.svg` / `logo-256.png`) centered above the card title at 64 px tall.**
- Optional thin gold rule beneath the logo, above the page title.
- Single-column form, large fields, language switch in top-right.

---

## 9. Motion

Motion is purposeful, never decorative.

- **Duration:** 150 ms (micro) / 250 ms (modal/page) / 400 ms (chart enter).
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` (gentle ease-out).
- **Respect** `prefers-reduced-motion`: disable enter animations and chart easing for users who request it.
- Hover states are color/background changes only, no scaling.
- Buttons compress 1 px on press for haptic feel.

---

## 10. Page Visual Patterns

### 10.1 Member Dashboard
- Hero KPI card (“This Year”) — large tabular number, gold accent strip, subtle category bar chart below.
- Recent contributions table.
- Big call-to-action: “Download annual family summary”.

### 10.2 Treasurer Dashboard
- 4 KPI cards in a row: Income, Expense, Net Balance, Pending Approvals.
- Two charts: monthly trend (bar) and category split (horizontal bar).
- Expenses table beneath with status chips.

### 10.3 Chaplain Approval Queue
- Calm, focused layout: a single column of pending expense cards with key fields and **Approve / Reject** buttons.
- Detail view opens in a side drawer, not a full page change.

### 10.4 Group Sub-Account Manager (CMO / CWO)
- Header card: sub-account name, running balance in gold, MTD in/out mini-bars.
- Two side-by-side entry forms: Income and Expense.
- Transaction ledger below.
- Bottom: monthly summary submission card with status chip.

### 10.5 Finance Council Oversight
- All read-only.
- 3 KPI cards + 2 trend charts + sub-account rollup table.
- Big banner reminder: “Aggregate view — per-member details are not shown.”

---

## 11. Annual / End-of-Year Family Contribution Summary (PDF) Visual Design

This is the most public artifact members will keep. It must look dignified and obviously trustworthy. The design **must** include the official organization logo and the Financial Secretary's signature — these are non-negotiable for v1.

### 11.1 Page Layout
- US Letter, 1 inch margins, single column.
- **Header band** (`brand-900` background, ~80 px tall):
  - **Official logo** (`logo.svg` or `logo-256.png`) on the left, 56–64 px tall, with required clear space (§7.1).
  - Organization full name in white Source Serif 4 Semibold to the right of the logo.
  - Optional small line beneath the name: *“San Jose, California”*.
- Thin gold rule (1 px `accent-600`) under the header band.
- **Cover line:** **“Annual Family Contribution Summary — [YEAR]”** in Source Serif 4, 24 pt.
- **Family block:** household name, primary member, member number, mailing address.
- **Two tables:**
  1. **Dues** — by category, with year totals.
  2. **Donations** — by sub-category, with year totals.
- **Grand total** in a soft gold card (`accent-100` background, `accent-600` 1 px border, `accent-600` label).

### 11.2 Signature Block (Required)

Every generated summary PDF must end with a signature block from the Financial Secretary:

- Positioned above the disclaimer, right-aligned within the content column (or centered on mobile-rendered PDFs).
- Components, top to bottom:
  1. The Financial Secretary's **signature image** (PNG with transparent background, ~180 px wide, ~60 px tall) rendered at 1.5–2 inches wide in the PDF.
  2. A thin `ink-700` rule, 2 inches long, immediately under the signature image.
  3. **Printed name** of the Financial Secretary (e.g., “Jane N. Okeke”) in Inter Medium, 11 pt.
  4. **Title line:** *“Financial Secretary, NICC-SJ”* in Inter Regular, 10 pt, `ink-500`.
  5. **Date generated:** *“Issued on YYYY-MM-DD”* in Inter Regular, 10 pt, `ink-500`.
- The signature image is uploaded once by the Financial Secretary in their profile settings (private, admin-managed) and stored in private Supabase Storage; the PDF generator fetches it via a short-lived signed URL at render time.
- If no signature is on file, the system **must not** generate the summary; instead it surfaces a clear error: *“Financial Secretary signature is required before annual summaries can be issued.”* This guarantees no unsigned official statement leaves the system.

### 11.3 Footer
- Disclaimer in 10 pt: *“Provided for personal record-keeping. Not an official IRS tax receipt.”*
- Page number, generation timestamp, and *“Generated by NICC-SJ Finance Portal”* in small caps, `ink-500`.

### 11.4 Authenticity Cues
- Header logo and signature together communicate that the document is officially issued.
- Optional v1.5: include a short verification code (e.g., last 8 chars of a SHA-256 hash of the statement payload) printed near the footer so any future verification flow can confirm authenticity.

---

## 12. Bilingual Considerations (English / Igbo)

- All visual components must accommodate **~30% longer strings** for Igbo without breaking layout (button widths, table headers).
- Language toggle in top bar uses the `languages` icon and the language name in its own script (`English` / `Igbo`).
- Avoid embedding text inside images — all text stays as real text for translation.

---

## 13. Accessibility (Visual Layer)

- Minimum body contrast 4.5:1; large text 3:1.
- Focus state visible on every interactive element (2 px ring, brand-500).
- Tap targets ≥ 44 × 44 px on mobile.
- Status communicated by color **and** icon **and** label.
- Charts include a textual or tabular fallback.
- Form errors announced to screen readers via `aria-live="polite"`.

---

## 14. Asset Inventory

### 14.1 Provided
- **`logo.jpg`** — official organization logo (raster), located at the repository root. This is the brand mark referenced throughout this document.

### 14.2 To Produce / Derive
1. **Logo derivatives** in `public/brand/` per §7.2: `logo.svg`, `logo-512.png`, `logo-256.png`, `logo-on-dark.png`, `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`.
2. **Open Graph image:** 1200 × 630, `brand-900` background with the official logo and organization name.
3. **PDF letterhead component:** SVG header for statement PDFs, embedding the official logo and gold rule.
4. **Email header banner:** 600 px wide, `brand-900` with the official logo (`logo-on-dark.png`).
5. **Financial Secretary signature image:** PNG with transparent background, captured at the time the role-holder is onboarded; stored privately. Required input to the annual summary PDF (§11.2).
6. **Empty-state line illustrations** (optional, v1.5): 4 simple line drawings — “No transactions yet”, “No members yet”, “Nothing to approve”, “Report not submitted”.

---

## 15. Dark Mode

Out of scope for v1. The visual system is light-mode only. Color tokens are documented so dark mode can be added later by mapping each surface token to a dark equivalent without reworking components.

---

## 16. Open Design Decisions (for review)

1. Confirm whether `logo.jpg` should be vector-traced into `logo.svg` now, or whether the team can supply the original vector artwork.
2. Confirm the exact Financial Secretary printed name and title text to render under the signature on the End-of-Year summary PDF.
3. Use of any photography in v1, or icons-only?
4. Whether the PDF statement header should include the parish's patron-saint reference, or remain neutral.
5. Whether to introduce dark mode in v1.5 or v2.
6. Should the email transactional template carry the same gold rule, or stay plain text for deliverability?
7. Whether to print a verification hash on the End-of-Year summary (§11.4) in v1 or defer to v1.5.

---

## 17. Next Design Deliverables

- Logo derivatives produced from `logo.jpg` and committed to `public/brand/` per §7.2.
- A signature-capture/upload flow for the Financial Secretary (admin-only), with private storage.
- Figma file (or equivalent) with the full design token set, components, and 5 key screens:
  1. Login
  2. Member Dashboard + Annual Summary PDF mockup
  3. Treasurer Dashboard
  4. Chaplain Approval Queue
  5. CMO/CWO Sub-Account Manager Page
- PDF statement template with sample data.
- Tailwind theme file (`tailwind.config.ts`) implementing the tokens in §3–§5.
- Icon usage cheatsheet for developers.
