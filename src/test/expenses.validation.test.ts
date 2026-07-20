import { describe, expect, it } from 'vitest';

import {
  expenseFormSchema,
  rejectionSchema,
  toExpenseInput,
  type ExpenseFormValues,
} from '@/lib/expenses/validation';

const valid: ExpenseFormValues = {
  category_id: 'cat1',
  payee: 'PG&E',
  amount: 120,
  expense_date: '2026-06-01',
  description: 'Hall electricity',
};

describe('expenseFormSchema (story 5.5)', () => {
  it('accepts a complete, valid expense', () => {
    expect(expenseFormSchema.safeParse(valid).success).toBe(true);
  });

  it('coerces a string amount to a number', () => {
    const parsed = expenseFormSchema.parse({ ...valid, amount: '120.50' as unknown as number });
    expect(parsed.amount).toBeCloseTo(120.5);
  });

  it('rejects a missing category', () => {
    const r = expenseFormSchema.safeParse({ ...valid, category_id: '' });
    expect(r.success).toBe(false);
  });

  it('rejects an empty payee', () => {
    const r = expenseFormSchema.safeParse({ ...valid, payee: '   ' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-positive amount', () => {
    expect(expenseFormSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...valid, amount: -5 }).success).toBe(false);
  });

  it('rejects a missing date', () => {
    expect(expenseFormSchema.safeParse({ ...valid, expense_date: '' }).success).toBe(false);
  });
});

describe('toExpenseInput', () => {
  it('normalises a blank description to null and carries the receipt path', () => {
    const input = toExpenseInput({ ...valid, description: '   ' }, 'receipts/2026/abc.pdf');
    expect(input.description).toBeNull();
    expect(input.receipt_path).toBe('receipts/2026/abc.pdf');
  });

  it('passes a null receipt path through (receipts are optional)', () => {
    const input = toExpenseInput(valid, null);
    expect(input.receipt_path).toBeNull();
    expect(input.payee).toBe('PG&E');
  });
});

describe('rejectionSchema (story 5.4)', () => {
  it('requires a non-empty reason', () => {
    expect(rejectionSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(rejectionSchema.safeParse({ reason: '   ' }).success).toBe(false);
    expect(rejectionSchema.safeParse({ reason: 'Out of budget' }).success).toBe(true);
  });
});
