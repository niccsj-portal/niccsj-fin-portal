import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  createMember,
  getMember,
  listHouseholds,
  nextMemberNumber,
  updateMember,
} from '@/lib/members/api';
import type { HouseholdRow } from '@/lib/members/types';
import {
  memberFormSchema,
  toMemberInput,
  type MemberFormInput,
  type MemberFormValues,
} from '@/lib/members/validation';

const FIELD =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDefaults: MemberFormInput = {
  member_number: 0,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  joined_date: today(),
  household_id: '',
  role_in_household: '',
  baptism_status: '',
  is_active: true,
};

/**
 * Create / edit member form (backlog 2.3, PRD §4.2). On create the member
 * number is pre-filled from `next_member_number()` but remains editable
 * (admin override). On edit the existing record is loaded and the form reset.
 */
export function MemberFormPage() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const memberId = params.id;
  const isEdit = Boolean(memberId);

  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormInput, unknown, MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    let active = true;
    if (!client) {
      setLoading(false);
      setFormError('The member form is unavailable: the app is not configured.');
      return;
    }

    void (async () => {
      try {
        const households = await listHouseholds(client);
        if (active) setHouseholds(households);

        if (isEdit && memberId) {
          const member = await getMember(client, memberId);
          if (!active) return;
          reset({
            member_number: member.member_number,
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email ?? '',
            phone: member.phone ?? '',
            address: member.address ?? '',
            joined_date: member.joined_date,
            household_id: member.household_id ?? '',
            role_in_household: member.role_in_household ?? '',
            baptism_status: member.baptism_status ?? '',
            is_active: member.is_active,
          });
        } else {
          const suggested = await nextMemberNumber(client);
          if (!active) return;
          reset({ ...emptyDefaults, member_number: suggested, joined_date: today() });
        }
      } catch {
        if (active) setFormError('We could not load the form. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [client, isEdit, memberId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!client) {
      setFormError('Saving is unavailable: the app is not configured.');
      return;
    }
    setFormError(null);
    const input = toMemberInput(values);
    try {
      if (isEdit && memberId) await updateMember(client, memberId, input);
      else await createMember(client, input);
      navigate('/members');
    } catch {
      setFormError('We could not save this member. Check the member number is unique and try again.');
    }
  });

  const title = isEdit ? 'Edit member' : 'New member';
  const householdOptions = useMemo(() => households, [households]);

  return (
    <div className="max-w-2xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">{title}</h1>

      {loading ? (
        <p className="mt-4 text-body-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4" aria-label={title}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="member_number" label="Member number" error={errors.member_number?.message}>
              <Input id="member_number" type="number" {...register('member_number')} />
            </Field>
            <Field id="joined_date" label="Date joined" error={errors.joined_date?.message}>
              <Input id="joined_date" type="date" {...register('joined_date')} />
            </Field>
            <Field id="first_name" label="First name" error={errors.first_name?.message}>
              <Input id="first_name" {...register('first_name')} />
            </Field>
            <Field id="last_name" label="Last name" error={errors.last_name?.message}>
              <Input id="last_name" {...register('last_name')} />
            </Field>
            <Field id="email" label="Email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Field>
            <Field id="phone" label="Phone" error={errors.phone?.message}>
              <Input id="phone" {...register('phone')} />
            </Field>
          </div>

          <Field id="address" label="Address" error={errors.address?.message}>
            <Input id="address" {...register('address')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="household_id" label="Household" error={errors.household_id?.message}>
              <select id="household_id" className={FIELD} {...register('household_id')}>
                <option value="">No household</option>
                {householdOptions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="role_in_household"
              label="Role in household"
              error={errors.role_in_household?.message}
            >
              <select id="role_in_household" className={FIELD} {...register('role_in_household')}>
                <option value="">—</option>
                <option value="head">Head</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
              </select>
            </Field>
            <Field
              id="baptism_status"
              label="Baptism status"
              error={errors.baptism_status?.message}
            >
              <select id="baptism_status" className={FIELD} {...register('baptism_status')}>
                <option value="">Not recorded</option>
                <option value="baptized">Baptized</option>
                <option value="not_baptized">Not baptized</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-body-sm text-ink-900">
            <input type="checkbox" {...register('is_active')} /> Active member
          </label>

          {formError ? (
            <p role="alert" className="text-body-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save member'}
            </Button>
            <Button asChild variant="outline">
              <Link to="/members">Cancel</Link>
            </Button>
          </div>
        </form>
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
