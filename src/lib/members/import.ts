import { z } from 'zod';

import type { BaptismStatus, MemberInput, RoleInHousehold } from '@/lib/members/types';

/**
 * Client-side CSV member import (backlog story 2.6, PRD §4.2). PapaParse turns
 * the uploaded file into header→value records in the page; this module is the
 * pure, unit-testable core that normalises headers, validates each row, and
 * maps it to a `MemberInput`. Audit rows are emitted by the story 1.4 triggers
 * when the page inserts the validated members.
 */

const roleInHousehold = z.enum(['head', 'spouse', 'child']);
const baptismStatus = z.enum(['baptized', 'not_baptized', 'unknown']);

const importRowSchema = z.object({
  member_number: z.coerce
    .number({ message: 'member_number must be a whole number' })
    .int('member_number must be a whole number')
    .positive('member_number must be greater than zero'),
  first_name: z.string().trim().min(1, 'first_name is required'),
  last_name: z.string().trim().min(1, 'last_name is required'),
  email: z
    .union([z.literal(''), z.string().trim().email('email is not valid')])
    .optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  joined_date: z.string().trim().min(1, 'joined_date is required'),
  role_in_household: z.union([z.literal(''), roleInHousehold]).optional(),
  baptism_status: z.union([z.literal(''), baptismStatus]).optional(),
});

export interface ImportRowResult {
  /** 1-based position within the data rows (excludes the header). */
  rowNumber: number;
  raw: Record<string, string>;
  member?: MemberInput;
  errors: string[];
}

export interface ImportPreview {
  results: ImportRowResult[];
  validCount: number;
  invalidCount: number;
}

const blankToNull = (v: string | undefined): string | null => {
  const trimmed = (v ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

/** Lowercase + trim header keys so "First Name" and "first_name" both work. */
function normaliseKeys(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.trim().toLowerCase().replace(/\s+/g, '_')] = value ?? '';
  }
  return out;
}

/** Validate parsed CSV rows into member inputs, collecting per-row errors. */
export function validateImportRows(rows: Record<string, string>[]): ImportPreview {
  const results: ImportRowResult[] = rows.map((raw, index) => {
    const row = normaliseKeys(raw);
    const parsed = importRowSchema.safeParse(row);
    if (!parsed.success) {
      return {
        rowNumber: index + 1,
        raw,
        errors: parsed.error.issues.map((i) => i.message),
      };
    }
    const v = parsed.data;
    const member: MemberInput = {
      member_number: v.member_number,
      first_name: v.first_name.trim(),
      last_name: v.last_name.trim(),
      email: blankToNull(v.email),
      phone: blankToNull(v.phone),
      address: blankToNull(v.address),
      joined_date: v.joined_date.trim(),
      household_id: null,
      role_in_household: (blankToNull(v.role_in_household) as RoleInHousehold | null) ?? null,
      baptism_status: (blankToNull(v.baptism_status) as BaptismStatus | null) ?? null,
      is_active: true,
    };
    return { rowNumber: index + 1, raw, member, errors: [] };
  });

  const validCount = results.filter((r) => r.errors.length === 0).length;
  return { results, validCount, invalidCount: results.length - validCount };
}
