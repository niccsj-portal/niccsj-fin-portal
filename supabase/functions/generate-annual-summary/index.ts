// @ts-nocheck — Deno runtime; typechecked by `deno check`, not the SPA tsc build.
//
// generate-annual-summary (Sprint 8 story 8.3, PRD §4.6/§4.10, graphics.md §11)
// ---------------------------------------------------------------------------
// Issues the official End-of-Year Family Contribution Summary PDF:
//   1. verify JWT + role;
//   2. authorize — privileged roles (FS/Treasurer/Chaplain/Admin) may generate
//      for ANY household; a member may generate ONLY their own family's summary;
//   3. GATE — if no Financial Secretary signature is on file, return 409 with
//      `error: 'FS_SIGNATURE_REQUIRED'` so the UI can show the blocked message
//      (PRD §4.6 — "must not generate if no signature on file");
//   4. compute the family-year totals SERVER-SIDE (never trust the client);
//   5. render a branded PDF with pdf-lib (logo header + family block + category
//      breakdown + grand total + signature block + disclaimer footer);
//   6. return the PDF as a base64 JSON envelope for download.
// The signature bytes are read with the service role from the private
// `signatures` bucket at render time (short-lived, never exposed to the client).

import { z } from 'https://esm.sh/zod@3.23.8';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { adminClient, resolveCaller, type AppRole } from '../_shared/supabase.ts';
import { BRAND_LOGO_ON_DARK_PNG_BASE64 } from '../_shared/brandLogo.ts';

/** Roles that may generate ANY household's summary (PRD §7). */
const PRIVILEGED_ROLES: AppRole[] = ['fin_secretary', 'treasurer', 'chaplain', 'admin'];

const FS_SIGNATURE_REQUIRED_MESSAGE =
  'Financial Secretary signature is required before annual summaries can be issued.';

const inputSchema = z.object({
  household_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2200),
});

// ---- brand palette (tailwind.config.js) ------------------------------------
const BRAND_900 = rgb(0x0b / 255, 0x2b / 255, 0x5c / 255);
const ACCENT_600 = rgb(0xb9 / 255, 0x8a / 255, 0x2c / 255);
const ACCENT_100 = rgb(0xfb / 255, 0xf3 / 255, 0xdd / 255);
const INK_900 = rgb(0x0f / 255, 0x17 / 255, 0x2a / 255);
const INK_700 = rgb(0x33 / 255, 0x41 / 255, 0x55 / 255);
const INK_500 = rgb(0x64 / 255, 0x74 / 255, 0x8b / 255);
const WHITE = rgb(1, 1, 1);

const ORG_NAME = 'Nigerian Igbo Catholic Community of San Jose';
const FS_TITLE = 'Financial Secretary, NICC-SJ';

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeName(name: string): string {
  return (name || 'Family').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Family';
}

function personName(row: { first_name?: string; last_name?: string } | null): string {
  if (!row) return '';
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const caller = await resolveCaller(req);
  if (!caller) return errorResponse('Unauthorized', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return errorResponse('Invalid summary input.', 422);
  const { household_id, year } = parsed.data;

  const admin = adminClient();

  // ---- authorization ------------------------------------------------------
  if (!PRIVILEGED_ROLES.includes(caller.role)) {
    // A non-privileged caller may only generate their OWN family's summary.
    const { data: profile, error: profileErr } = await admin
      .from('users')
      .select('member_id')
      .eq('id', caller.id)
      .single();
    if (profileErr || !profile?.member_id) {
      return errorResponse('You can only generate your own family summary.', 403);
    }
    const { data: member, error: memberErr } = await admin
      .from('members')
      .select('household_id')
      .eq('id', profile.member_id)
      .single();
    if (memberErr || !member || member.household_id !== household_id) {
      return errorResponse('You can only generate your own family summary.', 403);
    }
  }

  // ---- signature gate (PRD §4.6) ------------------------------------------
  const { data: signers, error: signerErr } = await admin
    .from('users')
    .select('email, fin_sec_signature_path, members:member_id(first_name, last_name)')
    .eq('role', 'fin_secretary')
    .not('fin_sec_signature_path', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (signerErr) return errorResponse(signerErr.message, 500);
  const signer = signers?.[0];
  if (!signer?.fin_sec_signature_path) {
    return jsonResponse({ error: 'FS_SIGNATURE_REQUIRED', message: FS_SIGNATURE_REQUIRED_MESSAGE }, 409);
  }
  const signatureName =
    personName(signer.members) || (signer.email ? signer.email.split('@')[0] : '') || 'Financial Secretary';

  // ---- family + year data (server-side; never trust the client) -----------
  const { data: household, error: householdErr } = await admin
    .from('households')
    .select('id, name, family_number, primary_member_id')
    .eq('id', household_id)
    .single();
  if (householdErr || !household) return errorResponse('Household not found.', 404);

  let primary: { first_name?: string; last_name?: string; member_number?: number; address?: string } | null = null;
  if (household.primary_member_id) {
    const { data } = await admin
      .from('members')
      .select('first_name, last_name, member_number, address')
      .eq('id', household.primary_member_id)
      .maybeSingle();
    primary = data ?? null;
  }

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { data: contribs, error: contribErr } = await admin
    .from('contributions')
    .select('amount, category_id, categories:category_id(name)')
    .eq('household_id', household_id)
    .eq('is_active', true)
    .gte('contribution_date', start)
    .lte('contribution_date', end);
  if (contribErr) return errorResponse(contribErr.message, 500);

  const totalsByCategory = new Map<string, { name: string; total: number }>();
  for (const row of contribs ?? []) {
    const key = row.category_id;
    const name = row.categories?.name ?? 'Uncategorized';
    const prev = totalsByCategory.get(key) ?? { name, total: 0 };
    prev.total += Number(row.amount);
    totalsByCategory.set(key, prev);
  }
  const categories = Array.from(totalsByCategory.values()).sort((a, b) => b.total - a.total);

  // Group dues attributed to this household's members on the CMO/CWO ledgers
  // (PRD §4.5). These are separate from the main contribution ledger, so they
  // are shown as their own "Group dues — <group>" lines and roll into the total.
  const { data: memberRows, error: memberListErr } = await admin
    .from('members')
    .select('id')
    .eq('household_id', household_id);
  if (memberListErr) return errorResponse(memberListErr.message, 500);
  const memberIds = (memberRows ?? []).map((m) => m.id);

  const groupDues: { name: string; total: number }[] = [];
  if (memberIds.length > 0) {
    const { data: dues, error: duesErr } = await admin
      .from('sub_account_transactions')
      .select('amount, sub_accounts:sub_account_id(name)')
      .in('member_id', memberIds)
      .eq('direction', 'income')
      .eq('is_active', true)
      .gte('txn_date', start)
      .lte('txn_date', end);
    if (duesErr) return errorResponse(duesErr.message, 500);
    const byGroup = new Map<string, number>();
    for (const row of dues ?? []) {
      const groupName = row.sub_accounts?.name ?? 'Group';
      byGroup.set(groupName, (byGroup.get(groupName) ?? 0) + Number(row.amount));
    }
    for (const [groupName, total] of byGroup.entries()) {
      groupDues.push({ name: `Group dues — ${groupName}`, total });
    }
    groupDues.sort((a, b) => b.total - a.total);
  }

  // Combined breakdown (contributions + group dues) drives the table + total.
  const breakdown = [...categories, ...groupDues];
  const grandTotal = breakdown.reduce((sum, c) => sum + c.total, 0);
  const contributionCount = (contribs ?? []).length;

  // ---- signature image bytes (private storage, service role) --------------
  const { data: sigBlob, error: sigDownloadErr } = await admin.storage
    .from('signatures')
    .download(signer.fin_sec_signature_path);
  if (sigDownloadErr || !sigBlob) {
    return errorResponse('The signature image could not be read.', 500);
  }
  const signatureBytes = new Uint8Array(await sigBlob.arrayBuffer());

  // ---- render the PDF -----------------------------------------------------
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Annual Family Contribution Summary ${year}`);
  pdf.setAuthor('NICC-SJ Finance Portal');
  const page = pdf.addPage([612, 792]); // US Letter, points
  const { width, height } = page.getSize();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const margin = 72;
  const contentWidth = width - margin * 2;

  // Header band (brand-900) with logo + org name.
  const bandHeight = 72;
  page.drawRectangle({ x: 0, y: height - bandHeight, width, height: bandHeight, color: BRAND_900 });
  try {
    const logo = await pdf.embedPng(
      Uint8Array.from(atob(BRAND_LOGO_ON_DARK_PNG_BASE64), (c) => c.charCodeAt(0)),
    );
    const logoH = 44;
    const logoScale = logoH / logo.height;
    page.drawImage(logo, {
      x: margin,
      y: height - bandHeight + (bandHeight - logoH) / 2,
      width: logo.width * logoScale,
      height: logoH,
    });
  } catch {
    // Logo embed is best-effort; the typographic header still identifies the org.
  }
  page.drawText(ORG_NAME, {
    x: margin + 64,
    y: height - 34,
    size: 13,
    font: serifBold,
    color: WHITE,
    maxWidth: contentWidth - 64,
  });
  page.drawText('San Jose, California', {
    x: margin + 64,
    y: height - 50,
    size: 9,
    font: helv,
    color: rgb(0.85, 0.89, 0.96),
  });

  // Gold rule under the band.
  page.drawRectangle({ x: 0, y: height - bandHeight - 2, width, height: 2, color: ACCENT_600 });

  let cursorY = height - bandHeight - 40;

  // Cover line.
  page.drawText(`Annual Family Contribution Summary — ${year}`, {
    x: margin,
    y: cursorY,
    size: 18,
    font: serifBold,
    color: INK_900,
  });
  cursorY -= 34;

  // Family block. The family number leads because that is the identifier the
  // community uses when donating; the per-person member number follows it.
  const familyLines = [
    household.family_number != null ? `Family number: ${household.family_number}` : null,
    `Household: ${household.name}`,
    primary ? `Primary member: ${personName(primary)}` : null,
    primary?.member_number != null ? `Member number: ${primary.member_number}` : null,
    primary?.address ? `Address: ${primary.address}` : null,
  ].filter(Boolean) as string[];
  for (const line of familyLines) {
    page.drawText(line, { x: margin, y: cursorY, size: 11, font: helv, color: INK_700 });
    cursorY -= 16;
  }
  cursorY -= 14;

  // Breakdown table header.
  page.drawText('Category', { x: margin, y: cursorY, size: 11, font: helvBold, color: INK_900 });
  page.drawText('Amount', {
    x: width - margin - helvBold.widthOfTextAtSize('Amount', 11),
    y: cursorY,
    size: 11,
    font: helvBold,
    color: INK_900,
  });
  cursorY -= 8;
  page.drawRectangle({ x: margin, y: cursorY, width: contentWidth, height: 1, color: INK_500 });
  cursorY -= 18;

  if (breakdown.length === 0) {
    page.drawText('No contributions recorded for this year.', {
      x: margin,
      y: cursorY,
      size: 11,
      font: helv,
      color: INK_500,
    });
    cursorY -= 20;
  } else {
    for (const cat of breakdown) {
      const amount = money(cat.total);
      page.drawText(cat.name, { x: margin, y: cursorY, size: 11, font: helv, color: INK_700 });
      page.drawText(amount, {
        x: width - margin - helv.widthOfTextAtSize(amount, 11),
        y: cursorY,
        size: 11,
        font: helv,
        color: INK_700,
      });
      cursorY -= 18;
    }
  }
  cursorY -= 6;

  // Grand total card (accent-100 fill + accent-600 border).
  const cardHeight = 40;
  cursorY -= cardHeight;
  page.drawRectangle({
    x: margin,
    y: cursorY,
    width: contentWidth,
    height: cardHeight,
    color: ACCENT_100,
    borderColor: ACCENT_600,
    borderWidth: 1,
  });
  page.drawText('Total contributions', {
    x: margin + 12,
    y: cursorY + cardHeight / 2 - 6,
    size: 12,
    font: helvBold,
    color: INK_900,
  });
  const totalText = money(grandTotal);
  page.drawText(totalText, {
    x: width - margin - 12 - helvBold.widthOfTextAtSize(totalText, 14),
    y: cursorY + cardHeight / 2 - 7,
    size: 14,
    font: helvBold,
    color: INK_900,
  });

  // Signature block (right-aligned, above the footer).
  const issuedOn = new Date().toISOString().slice(0, 10);
  const sigBlockWidth = 200;
  const sigX = width - margin - sigBlockWidth;
  let sigY = 168;
  try {
    const sigImage = await pdf.embedPng(signatureBytes);
    const sigW = Math.min(sigBlockWidth, 144);
    const sigScale = sigW / sigImage.width;
    const sigH = Math.min(sigImage.height * sigScale, 54);
    page.drawImage(sigImage, {
      x: sigX + sigBlockWidth - sigImage.width * (sigH / sigImage.height),
      y: sigY,
      width: sigImage.width * (sigH / sigImage.height),
      height: sigH,
    });
  } catch {
    return errorResponse('The signature image is not a valid PNG.', 422);
  }
  sigY -= 6;
  page.drawRectangle({ x: sigX, y: sigY, width: sigBlockWidth, height: 1, color: INK_700 });
  sigY -= 16;
  const drawRightText = (text: string, font, size: number, color) => {
    page.drawText(text, {
      x: width - margin - font.widthOfTextAtSize(text, size),
      y: sigY,
      size,
      font,
      color,
    });
    sigY -= size + 3;
  };
  drawRightText(signatureName, helvBold, 11, INK_900);
  drawRightText(FS_TITLE, helv, 10, INK_500);
  drawRightText(`Issued on ${issuedOn}`, helv, 10, INK_500);

  // Footer.
  const footerY = 54;
  page.drawRectangle({ x: margin, y: footerY + 20, width: contentWidth, height: 1, color: INK_500 });
  page.drawText('Provided for personal record-keeping. Not an official IRS tax receipt.', {
    x: margin,
    y: footerY + 6,
    size: 9,
    font: helv,
    color: INK_500,
  });
  page.drawText('Generated by NICC-SJ Finance Portal', {
    x: margin,
    y: footerY - 8,
    size: 8,
    font: helv,
    color: INK_500,
  });
  page.drawText(`Page 1 of 1  ·  Generated ${issuedOn}`, {
    x: width - margin - helv.widthOfTextAtSize(`Page 1 of 1  ·  Generated ${issuedOn}`, 8),
    y: footerY - 8,
    size: 8,
    font: helv,
    color: INK_500,
  });

  const pdfBytes = await pdf.save();
  const filename = `NICC-SJ_Annual_Summary_${year}_${safeName(household.name)}.pdf`;

  return jsonResponse(
    {
      filename,
      contentType: 'application/pdf',
      dataBase64: encodeBase64(pdfBytes),
      meta: { grandTotal, contributionCount, categoryCount: breakdown.length },
    },
    200,
  );
});
