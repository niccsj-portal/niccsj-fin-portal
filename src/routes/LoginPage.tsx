import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import { loginSchema, type LoginValues } from '@/lib/auth/validation';

/**
 * Login screen (backlog 1.5, PRD §4.1, gfx §8.10).
 *
 * Accepts an email address OR a member number plus a password. Member-number
 * logins are resolved to an email server-side (RPC `email_for_member_number`)
 * inside AuthContext.signIn, so this component stays presentation-only.
 */
export function LoginPage() {
  const { signIn, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  // Navigate only once the auth session is fully established. `signIn` resolves
  // before the onAuthStateChange listener has applied the session + role, so
  // redirecting here (rather than right after signIn) avoids the RequireAuth
  // gate bouncing the user back to /login — the "log in twice" bug.
  useEffect(() => {
    if (status === 'authenticated') {
      navigate(redirectTo, { replace: true });
    }
  }, [status, navigate, redirectTo]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await signIn(values.identifier, values.password);
    if (error) {
      setFormError(error);
    }
    // On success, the status effect above performs the redirect once the
    // session + role have loaded.
  });

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your email or member number."
      footer={
        <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Sign in">
        <div className="space-y-1.5">
          <label htmlFor="identifier" className="text-body-sm font-medium text-ink-900">
            Email or member number
          </label>
          <Input
            id="identifier"
            autoComplete="username"
            aria-invalid={errors.identifier ? 'true' : undefined}
            aria-describedby={errors.identifier ? 'identifier-error' : undefined}
            {...register('identifier')}
          />
          {errors.identifier ? (
            <p id="identifier-error" role="alert" className="text-caption text-destructive">
              {errors.identifier.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-body-sm font-medium text-ink-900">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
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

        {formError ? (
          <p role="alert" className="text-body-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
