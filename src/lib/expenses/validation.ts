import { z } from 'zod';

import type { ExpenseInput } from '@/lib/expenses/types';

/**
 * Expense form validation (PRD §4.4, story 5.5). Inputs arrive as strings from
 * the DOM; `amount` is coerced to a positive number and optional text fields
 * ('') are normalised to `null` by `toExpenseInput`. The receipt is optional
 * (PRD §4.4) and is uploaded separately — the form passes its storage path.
 */

export const expenseFormSchema = z.object({
  category_id: z.string().min(1, 'Select a category.'),
  payee: z.string().trim().min(1, 'Enter who was paid.'),
  amount: z.coerce
    .number({ message: 'Enter an amount.' })
    .positive('Amount must be greater than zero.'),
  expense_date: z.string().min(1, 'Date is required.'),
  description: z.string().trim().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
/** Pre-validation shape (amount arrives as a string/unknown from the DOM). */
export type ExpenseFormInput = z.input<typeof expenseFormSchema>;

const blankToNull = (v: string | undefined): string | null => {
  const trimmed = (v ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Normalise a parsed form value + uploaded receipt path to the data-layer
 * shape ('' → null).
 */
export function toExpenseInput(
  values: ExpenseFormValues,
  receiptPath: string | null,
): ExpenseInput {
  return {
    category_id: values.category_id,
    payee: values.payee,
    description: blankToNull(values.description),
    amount: values.amount,
    expense_date: values.expense_date,
    receipt_path: receiptPath,
  };
}

/**
 * Rejection reason (story 5.4). Required when a Chaplain/Admin rejects an
 * expense so the decision is explained and captured in the audit trail.
 */
export const rejectionSchema = z.object({
  reason: z.string().trim().min(1, 'Please give a reason for rejecting this expense.'),
});

export type RejectionValues = z.infer<typeof rejectionSchema>;
