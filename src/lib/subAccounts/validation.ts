import { z } from 'zod';

import type {
  SubAccountTransactionInput,
  SubAccountTxnDirection,
} from '@/lib/subAccounts/types';

/**
 * Sub-account transaction form validation (PRD §4.5, story 6.3). Inputs arrive
 * as strings from the DOM; `amount` is coerced to a positive number and
 * optional text fields ('') are normalised to `null` by `toTransactionInput`.
 * The same form records both income and expense — `direction` decides which.
 */

export const subAccountTransactionSchema = z.object({
  direction: z.enum(['income', 'expense'], { message: 'Choose income or expense.' }),
  amount: z.coerce
    .number({ message: 'Enter an amount.' })
    .positive('Amount must be greater than zero.'),
  txn_date: z.string().min(1, 'Date is required.'),
  category_id: z.string().optional(),
  member_id: z.string().optional(),
  payee: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export type SubAccountTransactionValues = z.infer<typeof subAccountTransactionSchema>;
/** Pre-validation shape (amount arrives as a string/unknown from the DOM). */
export type SubAccountTransactionFormInput = z.input<typeof subAccountTransactionSchema>;

const blankToNull = (v: string | undefined): string | null => {
  const trimmed = (v ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Normalise a parsed form value to the data-layer shape for a given
 * sub-account ('' → null).
 */
export function toTransactionInput(
  subAccountId: string,
  values: SubAccountTransactionValues,
): SubAccountTransactionInput {
  return {
    sub_account_id: subAccountId,
    direction: values.direction as SubAccountTxnDirection,
    category_id: blankToNull(values.category_id),
    member_id: blankToNull(values.member_id),
    payee: blankToNull(values.payee),
    description: blankToNull(values.description),
    amount: values.amount,
    txn_date: values.txn_date,
  };
}
