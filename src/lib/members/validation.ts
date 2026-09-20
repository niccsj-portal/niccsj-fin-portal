import { z } from 'zod';

import type { BaptismStatus, MemberInput, RoleInHousehold } from '@/lib/members/types';

/**
 * Member + household form validation (PRD §4.2). Inputs arrive as strings from
 * the DOM, so optional text fields accept '' and are normalised to `null` by
 * the `toMemberInput` / `toHouseholdInput` mappers before hitting the data
 * layer. `member_number` is coerced to a positive integer (auto-suggested by
 * `next_member_number()` but overridable by an admin — PRD §4.2).
 */

const roleInHousehold = z.enum(['head', 'spouse', 'child']);
const baptismStatus = z.enum(['baptized', 'not_baptized', 'unknown']);

export const memberFormSchema = z.object({
  member_number: z.coerce
    .number({ message: 'Member number must be a whole number.' })
    .int('Member number must be a whole number.')
    .positive('Member number must be greater than zero.'),
  first_name: z.string().trim().min(1, 'First name is required.'),
  last_name: z.string().trim().min(1, 'Last name is required.'),
  email: z
    .union([z.literal(''), z.string().trim().email('Enter a valid email address.')])
    .optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  joined_date: z.string().min(1, 'Joined date is required.'),
  household_id: z.string().optional(),
  role_in_household: z.union([z.literal(''), roleInHousehold]).optional(),
  baptism_status: z.union([z.literal(''), baptismStatus]).optional(),
  is_active: z.boolean(),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
/** Pre-validation shape (member_number arrives as a string/unknown from the DOM). */
export type MemberFormInput = z.input<typeof memberFormSchema>;

/** Normalise a parsed form value to the data-layer shape ('' → null). */
export function toMemberInput(values: MemberFormValues): MemberInput {
  const blankToNull = (v: string | undefined): string | null => {
    const trimmed = (v ?? '').trim();
    return trimmed === '' ? null : trimmed;
  };
  return {
    member_number: values.member_number,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: blankToNull(values.email),
    phone: blankToNull(values.phone),
    address: blankToNull(values.address),
    joined_date: values.joined_date,
    household_id: blankToNull(values.household_id),
    role_in_household: (blankToNull(values.role_in_household) as RoleInHousehold | null) ?? null,
    baptism_status: (blankToNull(values.baptism_status) as BaptismStatus | null) ?? null,
    is_active: values.is_active,
  };
}

export const householdFormSchema = z.object({
  name: z.string().trim().min(1, 'Household name is required.'),
  family_number: z
    .union([
      z.literal(''),
      z.coerce
        .number({ message: 'Family number must be a whole number.' })
        .int('Family number must be a whole number.')
        .positive('Family number must be greater than zero.'),
    ])
    .optional(),
  primary_member_id: z.string().optional(),
});

export type HouseholdFormValues = z.infer<typeof householdFormSchema>;
/** Pre-validation shape (family_number arrives as a string from the DOM). */
export type HouseholdFormInput = z.input<typeof householdFormSchema>;

export function toHouseholdInput(values: HouseholdFormValues): {
  name: string;
  family_number: number | null;
  primary_member_id: string | null;
} {
  const primary = (values.primary_member_id ?? '').trim();
  const family = values.family_number;
  return {
    name: values.name.trim(),
    family_number: family === '' || family === undefined ? null : family,
    primary_member_id: primary === '' ? null : primary,
  };
}

/**
 * Member self-service profile edit (story 3.2). A member may only change their
 * own contact details — email, phone, address. Name, member number, household
 * and status remain admin-managed (and RLS `members_update_self` constrains the
 * row, not the columns, so the UI restricts the editable surface).
 */
export const profileFormSchema = z.object({
  email: z
    .union([z.literal(''), z.string().trim().email('Enter a valid email address.')])
    .optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Normalise the profile form to the partial member update ('' → null). */
export function toProfileUpdate(
  values: ProfileFormValues,
): Pick<MemberInput, 'email' | 'phone' | 'address'> {
  const blankToNull = (v: string | undefined): string | null => {
    const trimmed = (v ?? '').trim();
    return trimmed === '' ? null : trimmed;
  };
  return {
    email: blankToNull(values.email),
    phone: blankToNull(values.phone),
    address: blankToNull(values.address),
  };
}
