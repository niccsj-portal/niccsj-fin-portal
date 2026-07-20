import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/auth/validation';

/**
 * Forgot-password screen (backlog 1.6, PRD §4.1 / §4.7). Sends a Supabase
 * magic reset link to the entered email. To avoid leaking which emails exist,
 * the success message is shown regardless of whether the address is on file.
 */
export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await requestPasswordReset(values.email);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
    toast.success('If that email is on file, a reset link is on its way.');
  });

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="rounded-md bg-brand-100 p-4 text-body-sm text-brand-900">
          If that email is on file, a reset link is on its way. Check your inbox (and spam folder).
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Reset password">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-body-sm font-medium text-ink-900">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email ? (
              <p id="email-error" role="alert" className="text-caption text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
