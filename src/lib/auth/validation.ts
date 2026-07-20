import { z } from 'zod';

/**
 * Login accepts EITHER an email address OR a member number (PRD §4.1):
 *   "Login by email or member number + password (member-number login
 *    resolves to the user's email server-side)."
 *
 * A member number is a positive integer (the existing roster runs 1..78,
 * PRD §4.2). Anything containing '@' is treated as an email. The actual
 * member-number → email resolution happens server-side via the
 * `email_for_member_number` RPC (migration 1.5); these helpers only classify
 * and validate the typed identifier.
 */

const MEMBER_NUMBER_RE = /^\d{1,9}$/;

export type LoginIdentifierKind = 'email' | 'member_number';

export function classifyIdentifier(raw: string): LoginIdentifierKind {
  return raw.includes('@') ? 'email' : 'member_number';
}

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your email or member number.')
    .refine(
      (value) =>
        value.includes('@')
          ? z.string().email().safeParse(value).success
          : MEMBER_NUMBER_RE.test(value),
      'Enter a valid email address or member number.',
    ),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string().min(1, 'Re-enter your new password.'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  });

export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;
