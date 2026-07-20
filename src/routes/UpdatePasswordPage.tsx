import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import { updatePasswordSchema, type UpdatePasswordValues } from '@/lib/auth/validation';

/**
 * Set-new-password screen (backlog 1.6). This is the redirect target of the
 * magic reset link: Supabase establishes a recovery session from the URL hash,
 * after which `updateUser({ password })` sets the new password.
 */
export function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await updatePassword(values.password);
    if (error) {
      setFormError(error);
      return;
    }
    toast.success('Your password has been updated. Please sign in.');
    navigate('/login', { replace: true });
  });

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you don't use elsewhere.">
      <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Set new password">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-body-sm font-medium text-ink-900">
            New password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password ? (
            <p id="password-error" role="alert" className="text-caption text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-body-sm font-medium text-ink-900">
            Confirm new password
          </label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirm ? 'true' : undefined}
            aria-describedby={errors.confirm ? 'confirm-error' : undefined}
            {...register('confirm')}
          />
          {errors.confirm ? (
            <p id="confirm-error" role="alert" className="text-caption text-destructive">
              {errors.confirm.message}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="text-body-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
