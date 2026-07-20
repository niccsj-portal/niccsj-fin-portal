import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { getMember, listHouseholds, listMembers, updateMember } from '@/lib/members/api';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import {
  profileFormSchema,
  toProfileUpdate,
  type ProfileFormValues,
} from '@/lib/members/validation';

/**
 * Member self-service profile (backlog story 3.2; UX §5.1). A member views
 * their own record and household, and edits only their contact details (email,
 * phone, address). RLS `members_update_self` guarantees they can update no row
 * but their own; name / member number / household stay admin-managed.
 */
export function MemberProfilePage() {
  const { t } = useTranslation();
  const { client, memberId } = useAuth();
  const [member, setMember] = useState<MemberRow | null>(null);
  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { email: '', phone: '', address: '' },
  });

  useEffect(() => {
    let active = true;
    if (!client || !memberId) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const me = await getMember(client, memberId);
        const [households, members] = await Promise.all([
          listHouseholds(client),
          listMembers(client),
        ]);
        if (!active) return;
        setMember(me);
        setHousehold(households.find((h) => h.id === me.household_id) ?? households[0] ?? null);
        setHouseholdMembers(members);
        reset({
          email: me.email ?? '',
          phone: me.phone ?? '',
          address: me.address ?? '',
        });
      } catch {
        if (active) setFormError(t('profile.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [client, memberId, reset, t]);

  const onSubmit = handleSubmit(async (values) => {
    if (!client || !memberId) {
      setFormError(t('profile.notConfigured'));
      return;
    }
    setFormError(null);
    setSaved(false);
    try {
      await updateMember(client, memberId, toProfileUpdate(values));
      setSaved(true);
    } catch {
      setFormError(t('profile.saveError'));
    }
  });

  const fullName = member ? `${member.first_name} ${member.last_name}`.trim() : '';

  return (
    <div className="max-w-2xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">{t('profile.title')}</h1>

      {loading ? (
        <p className="mt-4 text-body-sm text-muted-foreground">{t('profile.loading')}</p>
      ) : !member ? (
        <p className="mt-4 text-body-sm text-ink-700">{t('profile.notLinked')}</p>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Read-only identity */}
          <Card>
            <CardHeader>
              <CardTitle>{fullName}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-2 text-body-sm sm:grid-cols-2">
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-500">{t('profile.memberNumber')}</dt>
                  <dd className="tabular-nums text-ink-900">{member.member_number}</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-500">{t('profile.household')}</dt>
                  <dd className="text-ink-900">{household?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-500">{t('profile.roleInHousehold')}</dt>
                  <dd className="text-ink-900">
                    {member.role_in_household ? t(`roles.${member.role_in_household}`) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-500">{t('profile.baptismStatus')}</dt>
                  <dd className="text-ink-900">
                    {member.baptism_status ? t(`baptism.${member.baptism_status}`) : '—'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Editable contact details */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.contactDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={t('profile.editAria')}>
                <Field id="email" label={t('profile.email')} error={errors.email?.message}>
                  <Input id="email" type="email" autoComplete="email" {...register('email')} />
                </Field>
                <Field id="phone" label={t('profile.phone')} error={errors.phone?.message}>
                  <Input id="phone" type="tel" autoComplete="tel" {...register('phone')} />
                </Field>
                <Field id="address" label={t('profile.address')} error={errors.address?.message}>
                  <Input id="address" autoComplete="street-address" {...register('address')} />
                </Field>

                {formError ? (
                  <p role="alert" className="text-body-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
                {saved ? (
                  <p role="status" className="text-body-sm text-success">
                    {t('profile.saved')}
                  </p>
                ) : null}

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('profile.saving') : t('profile.save')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Household members (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.myHousehold')}</CardTitle>
            </CardHeader>
            <CardContent>
              {householdMembers.length === 0 ? (
                <p className="text-body-sm text-ink-500">{t('profile.noHouseholdMembers')}</p>
              ) : (
                <ul className="divide-y divide-line-200" aria-label={t('profile.householdMembersAria')}>
                  {householdMembers.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2 text-body-sm">
                      <span className="text-ink-900">
                        {m.first_name} {m.last_name}
                      </span>
                      <span className="text-ink-500">
                        {m.role_in_household ? t(`roles.${m.role_in_household}`) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-body-sm font-medium text-ink-900">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
