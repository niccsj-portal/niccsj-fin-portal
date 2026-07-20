import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { isTwoFactorEligible, isTwoFactorMandatory, roleLabel } from '@/lib/auth/roles';

/**
 * TOTP 2FA enrollment (backlog 1.7, AR-6 hybrid policy).
 *
 *  - System Admin: enrollment is MANDATORY (the page communicates this).
 *  - FS / Treasurer / Group FS / Chaplain / Finance Council: OPT-IN.
 *  - Member: not eligible — the page explains 2FA isn't required.
 *
 * Uses Supabase Auth MFA factors (no extra TOTP dependency, per PM.md §5.1).
 */
type Phase = 'intro' | 'enrolling' | 'verify' | 'done';

export function TwoFactorEnrollPage() {
  const { role } = useAuth();
  const [phase, setPhase] = useState<Phase>('intro');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!role || !isTwoFactorEligible(role)) {
    return (
      <div className="mx-auto max-w-md py-8">
        <div className="rule-gold mb-4 w-16" aria-hidden="true" />
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Two-factor authentication</h1>
        <p className="mt-2 text-body text-ink-700">
          Two-factor authentication isn't required for your role
          {role ? ` (${roleLabel(role)})` : ''}. You're all set.
        </p>
      </div>
    );
  }

  const startEnrollment = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      toast.error('Two-factor setup is unavailable: the app is not configured.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (error || !data) {
      toast.error('Could not start 2FA enrollment. Please try again.');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp?.qr_code ?? null);
    setSecret(data.totp?.secret ?? null);
    setPhase('verify');
  };

  const verify = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !factorId) return;
    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setBusy(false);
      toast.error('Could not verify the code. Please try again.');
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error('That code was not accepted. Check your authenticator and try again.');
      return;
    }
    setPhase('done');
    toast.success('Two-factor authentication is now enabled.');
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Two-factor authentication</h1>
      <p className="mt-2 text-body-sm text-ink-700">
        {isTwoFactorMandatory(role)
          ? 'Your role requires two-factor authentication. Enroll an authenticator app to continue.'
          : 'Add an extra layer of security by enrolling an authenticator app.'}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {phase === 'done' ? 'Enabled' : 'Set up your authenticator'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === 'intro' ? (
            <Button type="button" onClick={startEnrollment} disabled={busy}>
              {busy ? 'Starting…' : 'Begin enrollment'}
            </Button>
          ) : null}

          {phase === 'verify' ? (
            <div className="space-y-4">
              <p className="text-body-sm text-ink-700">
                Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
              </p>
              {qrCode ? (
                <img src={qrCode} alt="Two-factor QR code" className="h-44 w-44" />
              ) : null}
              {secret ? (
                <p className="text-caption text-ink-700">
                  Can't scan? Enter this key manually: <code className="font-mono">{secret}</code>
                </p>
              ) : null}
              <div className="space-y-1.5">
                <label htmlFor="totp-code" className="text-body-sm font-medium text-ink-900">
                  Verification code
                </label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <Button type="button" onClick={verify} disabled={busy || code.trim().length < 6}>
                {busy ? 'Verifying…' : 'Verify and enable'}
              </Button>
            </div>
          ) : null}

          {phase === 'done' ? (
            <p role="status" className="text-body-sm text-brand-900">
              Two-factor authentication is enabled on your account.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
