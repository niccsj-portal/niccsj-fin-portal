import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { canEditMembers } from '@/lib/auth/roles';
import {
  createHousehold,
  listHouseholds,
  listMembers,
  nextFamilyNumber,
  setPrimaryMember,
} from '@/lib/members/api';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import {
  householdFormSchema,
  toHouseholdInput,
  type HouseholdFormInput,
  type HouseholdFormValues,
} from '@/lib/members/validation';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Household management (backlog 2.4, PRD §4.2). Create a household, see its
 * members, and designate the primary member (head of household). Spouse /
 * child assignment happens on the member form via household + role-in-household.
 */
export function HouseholdsPage() {
  const { client, role } = useAuth();
  const canEdit = canEditMembers(role);

  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HouseholdFormInput, unknown, HouseholdFormValues>({
    resolver: zodResolver(householdFormSchema),
    defaultValues: { name: '', family_number: '', primary_member_id: '' },
  });

  const load = useCallback(async () => {
    if (!client) {
      setError('Households are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [h, m] = await Promise.all([listHouseholds(client), listMembers(client, { status: 'all' })]);
      setHouseholds(h);
      setMembers(m);
    } catch {
      setError('We could not load households. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestFamilyNumber = useCallback(async () => {
    if (!client) return;
    try {
      setValue('family_number', String(await nextFamilyNumber(client)));
    } catch {
      // A failed suggestion is not fatal — the admin can type the number.
    }
  }, [client, setValue]);

  useEffect(() => {
    void suggestFamilyNumber();
  }, [suggestFamilyNumber]);

  const membersByHousehold = useMemo(() => {
    const map = new Map<string, MemberRow[]>();
    for (const m of members) {
      if (!m.household_id) continue;
      const list = map.get(m.household_id) ?? [];
      list.push(m);
      map.set(m.household_id, list);
    }
    return map;
  }, [members]);

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, `${m.first_name} ${m.last_name}`]));
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '—');
  }, [members]);

  const onCreate = handleSubmit(async (values) => {
    if (!client) return;
    setError(null);
    try {
      await createHousehold(client, toHouseholdInput(values));
      reset({ name: '', family_number: '', primary_member_id: '' });
      await suggestFamilyNumber();
      await load();
    } catch {
      setError('We could not create that household. Please try again.');
    }
  });

  const onSetPrimary = async (householdId: string, memberId: string) => {
    if (!client || !memberId) return;
    try {
      await setPrimaryMember(client, householdId, memberId);
      await load();
    } catch {
      setError('We could not update the primary member. Please try again.');
    }
  };

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Households</h1>

      {canEdit ? (
        <form onSubmit={onCreate} noValidate className="mt-4 flex flex-wrap items-end gap-3" aria-label="Create household">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="household-family-number" className="text-caption font-medium text-ink-700">
              Family number
            </label>
            <Input
              id="household-family-number"
              className="w-32"
              inputMode="numeric"
              {...register('family_number')}
            />
            {errors.family_number ? (
              <p role="alert" className="text-caption text-destructive">
                {errors.family_number.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="household-name" className="text-caption font-medium text-ink-700">
              New household name
            </label>
            <Input id="household-name" className="w-72" {...register('name')} />
            {errors.name ? (
              <p role="alert" className="text-caption text-destructive">
                {errors.name.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create household'}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <p className="text-body-sm text-muted-foreground">Loading households…</p>
        ) : households.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No households yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family #</TableHead>
                <TableHead>Household</TableHead>
                <TableHead>Primary member</TableHead>
                <TableHead>Members</TableHead>
                {canEdit ? <TableHead>Set primary</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {households.map((h) => {
                const hMembers = membersByHousehold.get(h.id) ?? [];
                return (
                  <TableRow key={h.id}>
                    <TableCell className="tabular-nums">{h.family_number ?? '—'}</TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{memberName(h.primary_member_id)}</TableCell>
                    <TableCell>{hMembers.length}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <select
                          aria-label={`Set primary member for ${h.name}`}
                          className={FIELD}
                          value={h.primary_member_id ?? ''}
                          onChange={(e) => onSetPrimary(h.id, e.target.value)}
                        >
                          <option value="">—</option>
                          {hMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.first_name} {m.last_name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
