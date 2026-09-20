import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  createCategory,
  createContribution,
  getContribution,
  listCategories,
  updateContribution,
} from '@/lib/contributions/api';
import type { CategoryRow } from '@/lib/contributions/types';
import { PAYMENT_METHODS } from '@/lib/contributions/types';
import {
  contributionFormSchema,
  toContributionInput,
  type ContributionFormInput,
  type ContributionFormValues,
} from '@/lib/contributions/validation';
import { listHouseholds, listMembers } from '@/lib/members/api';
import { householdLabel } from '@/lib/members/search';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';

const FIELD =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  card: 'Card',
  other: 'Other',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDefaults: ContributionFormInput = {
  household_id: '',
  member_id: '',
  category_id: '',
  amount: '' as unknown as number,
  contribution_date: today(),
  payment_method: 'cash',
  notes: '',
};

/**
 * Add / edit a contribution (stories 4.2, 4.3, 4.5; PRD §4.3, UX §6.2). A fresh
 * form defaults the date to today and keeps required fields minimal so a
 * recorder can capture a payment in well under 30 seconds (story 4.8). Donation
 * sub-categories can be created inline (story 4.3). Editing an existing entry
 * requires a correction reason, which is audited (story 4.5).
 */
export function ContributionFormPage() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const contributionId = params.id;
  const isEdit = Boolean(contributionId);

  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [newPurpose, setNewPurpose] = useState('');
  const [addingPurpose, setAddingPurpose] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormInput, unknown, ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: emptyDefaults,
  });

  const householdId = watch('household_id');
  const categoryId = watch('category_id');

  const donationsParent = useMemo(
    () => categories.find((c) => c.name.toLowerCase() === 'donations' && !c.parent_id),
    [categories],
  );
  const isDonationSelected = useMemo(() => {
    if (!donationsParent) return false;
    if (categoryId === donationsParent.id) return true;
    const selected = categories.find((c) => c.id === categoryId);
    return selected?.parent_id === donationsParent.id;
  }, [categories, categoryId, donationsParent]);

  useEffect(() => {
    let active = true;
    if (!client) {
      setLoading(false);
      setFormError('The contribution form is unavailable: the app is not configured.');
      return;
    }
    void (async () => {
      try {
        const [hh, mem, cats] = await Promise.all([
          listHouseholds(client),
          listMembers(client, { status: 'active' }),
          listCategories(client, { type: 'income', activeOnly: true }),
        ]);
        if (!active) return;
        setHouseholds(hh);
        setMembers(mem);
        setCategories(cats);

        if (isEdit && contributionId) {
          const row = await getContribution(client, contributionId);
          if (!active) return;
          reset({
            household_id: row.household_id,
            member_id: row.member_id ?? '',
            category_id: row.category_id,
            amount: row.amount as unknown as number,
            contribution_date: row.contribution_date,
            payment_method: row.payment_method,
            notes: row.notes ?? '',
          });
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
  }, [client, isEdit, contributionId, reset]);

  const memberOptions = useMemo(
    () => (householdId ? members.filter((m) => m.household_id === householdId) : members),
    [members, householdId],
  );

  async function onAddPurpose() {
    if (!client || !donationsParent) return;
    const name = newPurpose.trim();
    if (!name) return;
    setAddingPurpose(true);
    try {
      const created = await createCategory(client, {
        name,
        type: 'income',
        parent_id: donationsParent.id,
      });
      setCategories((prev) => [...prev, created]);
      setValue('category_id', created.id, { shouldValidate: true });
      setNewPurpose('');
    } catch {
      setFormError('We could not add that donation purpose. Please try again.');
    } finally {
      setAddingPurpose(false);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!client) {
      setFormError('Saving is unavailable: the app is not configured.');
      return;
    }
    if (isEdit && correctionReason.trim() === '') {
      setReasonError('Please give a reason for this correction.');
      return;
    }
    setFormError(null);
    setReasonError(null);
    const input = toContributionInput(values);
    try {
      if (isEdit && contributionId) {
        await updateContribution(client, contributionId, {
          ...input,
          correction_reason: correctionReason.trim(),
        });
      } else {
        await createContribution(client, input);
      }
      navigate('/contributions');
    } catch {
      setFormError('We could not save this contribution. Please try again.');
    }
  });

  const title = isEdit ? 'Correct contribution' : 'Record a contribution';

  return (
    <div className="max-w-2xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">{title}</h1>

      {loading ? (
        <p className="mt-4 text-body-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4" aria-label={title}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="household_id" label="Household" error={errors.household_id?.message}>
              <select id="household_id" className={FIELD} {...register('household_id')}>
                <option value="">Select a household</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {householdLabel(h)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="member_id" label="Member (optional)" error={errors.member_id?.message}>
              <select id="member_id" className={FIELD} {...register('member_id')}>
                <option value="">Whole household</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="category_id" label="Category" error={errors.category_id?.message}>
              <select id="category_id" className={FIELD} {...register('category_id')}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `Donations — ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="amount" label="Amount (USD)" error={errors.amount?.message}>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                autoFocus
                {...register('amount')}
              />
            </Field>
            <Field
              id="contribution_date"
              label="Date"
              error={errors.contribution_date?.message}
            >
              <Input id="contribution_date" type="date" {...register('contribution_date')} />
            </Field>
            <Field
              id="payment_method"
              label="Payment method"
              error={errors.payment_method?.message}
            >
              <select id="payment_method" className={FIELD} {...register('payment_method')}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABELS[m]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {isDonationSelected && donationsParent ? (
            <div className="rounded-md border border-line-200 bg-surface-50 p-3">
              <label
                htmlFor="new-purpose"
                className="text-body-sm font-medium text-ink-900"
              >
                Add a donation purpose
              </label>
              <p className="text-caption text-ink-500">
                Create a new sub-category (e.g. “Funeral Support — Family X”).
              </p>
              <div className="mt-2 flex gap-2">
                <Input
                  id="new-purpose"
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  placeholder="Donation purpose"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAddPurpose}
                  disabled={addingPurpose || newPurpose.trim() === ''}
                >
                  Add
                </Button>
              </div>
            </div>
          ) : null}

          <Field id="notes" label="Notes (optional)" error={errors.notes?.message}>
            <Input id="notes" {...register('notes')} />
          </Field>

          {isEdit ? (
            <div className="space-y-1.5">
              <label
                htmlFor="correction_reason"
                className="text-body-sm font-medium text-ink-900"
              >
                Reason for correction
              </label>
              <Input
                id="correction_reason"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />
              <p className="text-caption text-ink-500">
                This reason is recorded in the audit trail.
              </p>
              {reasonError ? (
                <p role="alert" className="text-caption text-destructive">
                  {reasonError}
                </p>
              ) : null}
            </div>
          ) : null}

          {formError ? (
            <p role="alert" className="text-body-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save correction' : 'Save contribution'}
            </Button>
            <Button asChild variant="outline">
              <Link to="/contributions">Cancel</Link>
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
