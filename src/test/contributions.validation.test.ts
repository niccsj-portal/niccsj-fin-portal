import { describe, expect, it } from 'vitest';

import {
  contributionFormSchema,
  correctionSchema,
  donationSubcategorySchema,
  toContributionInput,
} from '@/lib/contributions/validation';

const valid = {
  household_id: 'h1',
  member_id: 'm1',
  category_id: 'cat1',
  amount: '50',
  contribution_date: '2025-03-01',
  payment_method: 'cash',
  notes: 'tithe',
};

describe('contribution form validation (story 4.2)', () => {
  it('accepts a complete entry and coerces amount to a number', () => {
    const parsed = contributionFormSchema.parse(valid);
    expect(parsed.amount).toBe(50);
  });

  it('requires a household and a category', () => {
    expect(contributionFormSchema.safeParse({ ...valid, household_id: '' }).success).toBe(false);
    expect(contributionFormSchema.safeParse({ ...valid, category_id: '' }).success).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    expect(contributionFormSchema.safeParse({ ...valid, amount: '0' }).success).toBe(false);
    expect(contributionFormSchema.safeParse({ ...valid, amount: '-5' }).success).toBe(false);
  });

  it('allows an omitted member (household-level payment)', () => {
    const result = contributionFormSchema.safeParse({ ...valid, member_id: '' });
    expect(result.success).toBe(true);
  });

  it('normalises blank optional fields to null in the data-layer input', () => {
    const parsed = contributionFormSchema.parse({ ...valid, member_id: '', notes: '' });
    const input = toContributionInput(parsed);
    expect(input.member_id).toBeNull();
    expect(input.notes).toBeNull();
  });
});

describe('donation sub-category + correction validation (stories 4.3/4.5)', () => {
  it('requires a name for a new donation purpose', () => {
    expect(donationSubcategorySchema.safeParse({ name: '' }).success).toBe(false);
    expect(donationSubcategorySchema.safeParse({ name: 'Funeral' }).success).toBe(true);
  });

  it('requires a reason when correcting an entry', () => {
    expect(correctionSchema.safeParse({ correction_reason: '' }).success).toBe(false);
    expect(correctionSchema.safeParse({ correction_reason: 'Wrong amount' }).success).toBe(true);
  });
});
