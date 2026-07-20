import { z } from 'zod';

import type { ContributionInput, PaymentMethod } from '@/lib/contributions/types';

/**
 * Contribution form validation (PRD §4.3, story 4.2). Inputs arrive as strings
 * from the DOM; `amount` is coerced to a positive number and optional text
 * fields ('' ) are normalised to `null` by `toContributionInput`. A household
 * is always required (the giving rolls up to a family); the member is optional
 * (a household-level payment need not name an individual).
 */

const paymentMethod = z.enum(['cash', 'check', 'zelle', 'card', 'other']);

export const contributionFormSchema = z.object({
  household_id: z.string().min(1, 'Select a household.'),
  member_id: z.string().optional(),
  category_id: z.string().min(1, 'Select a category.'),
  amount: z.coerce
    .number({ message: 'Enter an amount.' })
    .positive('Amount must be greater than zero.'),
  contribution_date: z.string().min(1, 'Date is required.'),
  payment_method: paymentMethod,
  notes: z.string().trim().optional(),
});

export type ContributionFormValues = z.infer<typeof contributionFormSchema>;
/** Pre-validation shape (amount arrives as a string/unknown from the DOM). */
export type ContributionFormInput = z.input<typeof contributionFormSchema>;

const blankToNull = (v: string | undefined): string | null => {
  const trimmed = (v ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

/** Normalise a parsed form value to the data-layer shape ('' → null). */
export function toContributionInput(values: ContributionFormValues): ContributionInput {
  return {
    household_id: values.household_id,
    member_id: blankToNull(values.member_id),
    category_id: values.category_id,
    amount: values.amount,
    contribution_date: values.contribution_date,
    payment_method: values.payment_method as PaymentMethod,
    notes: blankToNull(values.notes),
  };
}

/**
 * Ad-hoc donation sub-category creation from the form (story 4.3). Name is
 * required; the parent is the seeded "Donations" category.
 */
export const donationSubcategorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name for the donation purpose.'),
});

export type DonationSubcategoryValues = z.infer<typeof donationSubcategorySchema>;

/**
 * Correction reason (story 4.5). Required when editing an existing entry so the
 * change is explained and captured in the audit trail.
 */
export const correctionSchema = z.object({
  correction_reason: z.string().trim().min(1, 'Please give a reason for this correction.'),
});
