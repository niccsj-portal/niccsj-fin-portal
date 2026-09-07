import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Plus } from 'lucide-react';

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
import { canManageSubAccounts } from '@/lib/auth/roles';
import { listCategories } from '@/lib/contributions/api';
import type { CategoryRow } from '@/lib/contributions/types';
import { listHouseholds, listMembers } from '@/lib/members/api';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import {
  listSubAccountCategoryIds,
  listSubAccountReports,
  listSubAccountTransactions,
  listSubAccounts,
  recordSubAccountTransaction,
} from '@/lib/subAccounts/api';
import {
  buildTransactionLookups,
  filterTransactions,
  formatUSD,
  isDuesCategoryName,
  monthToDate,
  totals,
  transactionsToCsv,
  type TransactionFilter,
} from '@/lib/subAccounts/search';
import type {
  SubAccountReportRow,
  SubAccountRow,
  SubAccountTransactionRow,
  SubAccountTxnDirection,
} from '@/lib/subAccounts/types';
import {
  subAccountTransactionSchema,
  toTransactionInput,
  type SubAccountTransactionFormInput,
  type SubAccountTransactionValues,
} from '@/lib/subAccounts/validation';
import { MonthlySummaryPanel } from '@/routes/sub-accounts/MonthlySummaryPanel';

const FIELD =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDefaults: SubAccountTransactionFormInput = {
  direction: 'income',
  amount: '' as unknown as number,
  txn_date: today(),
  category_id: '',
  member_id: '',
  payee: '',
  description: '',
};

/** Display label for a member option in the payee picker. */
function memberLabel(m: MemberRow): string {
  return `${m.first_name} ${m.last_name} (#${m.member_number})`.trim();
}

/**
 * Sub-Account Manager (story 6.3; PRD §4.5). A Group Financial Secretary
 * manages their assigned group ledger here: a running balance + month-to-date
 * in/out, an inline income/expense form, the transaction ledger with filters
 * and a group-scoped CSV export, and the monthly summary panel. Overseers
 * (FS / Treasurer / Finance Council / Admin) reach this view read-only — RLS
 * decides which group(s) each caller can see and write. Admin-facing screen, so
 * plain English (no i18n).
 */
export function SubAccountManagerPage() {
  const { client, role } = useAuth();
  const canManage = canManageSubAccounts(role);

  const [subAccounts, setSubAccounts] = useState<SubAccountRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [groupCategoryIds, setGroupCategoryIds] = useState<string[]>([]);
  const [rows, setRows] = useState<SubAccountTransactionRow[]>([]);
  const [reports, setReports] = useState<SubAccountReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [direction, setDirectionFilter] = useState<SubAccountTxnDirection | 'all'>('all');
  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubAccountTransactionFormInput, unknown, SubAccountTransactionValues>({
    resolver: zodResolver(subAccountTransactionSchema),
    defaultValues: emptyDefaults,
  });

  const formDirection = watch('direction');
  const formCategoryId = watch('category_id');

  // Load the caller's sub-accounts + categories + members/households once.
  useEffect(() => {
    let active = true;
    if (!client) {
      setError('Sub-accounts are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const [accounts, cats, mem, hh] = await Promise.all([
          listSubAccounts(client),
          listCategories(client, { activeOnly: true }),
          listMembers(client, { status: 'active' }),
          listHouseholds(client),
        ]);
        if (!active) return;
        setSubAccounts(accounts);
        setCategories(cats);
        setMembers(mem);
        setHouseholds(hh);
        setSelectedId((prev) => prev || accounts[0]?.id || '');
      } catch {
        if (active) setError('We could not load your sub-accounts. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  // Load which categories this group may record against whenever it changes.
  useEffect(() => {
    let active = true;
    if (!client || !selectedId) {
      setGroupCategoryIds([]);
      return;
    }
    void (async () => {
      try {
        const ids = await listSubAccountCategoryIds(client, selectedId);
        if (active) setGroupCategoryIds(ids);
      } catch {
        if (active) setGroupCategoryIds([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [client, selectedId]);

  // (Re)load transactions + reports whenever the selected group changes.
  const loadLedger = useCallback(async () => {
    if (!client || !selectedId) return;
    setError(null);
    try {
      const [txns, reps] = await Promise.all([
        listSubAccountTransactions(client, selectedId, { activeOnly: true }),
        listSubAccountReports(client, selectedId),
      ]);
      setRows(txns);
      setReports(reps);
    } catch {
      setError('We could not load this group ledger. Please try again.');
    }
  }, [client, selectedId]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const lookups = useMemo(() => buildTransactionLookups(categories), [categories]);

  const filter: TransactionFilter = useMemo(
    () => ({ direction, search }),
    [direction, search],
  );
  const visible = useMemo(
    () => filterTransactions(rows, filter, lookups),
    [rows, filter, lookups],
  );

  const allTotals = useMemo(() => totals(rows), [rows]);
  const now = useMemo(() => new Date(), []);
  const mtd = useMemo(
    () => monthToDate(rows, now.getFullYear(), now.getMonth() + 1),
    [rows, now],
  );

  // Categories relevant to the form's current direction (income vs expense).
  // Group income is scoped to this group's mapped categories (their own dues +
  // donations, PRD §7). If no mapping exists yet we fall back to all income
  // categories so recording is never blocked. Expenses are never scoped.
  const formCategories = useMemo(() => {
    const byDirection = categories
      .filter((c) => c.type === formDirection)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (formDirection !== 'income' || groupCategoryIds.length === 0) return byDirection;
    const allowed = new Set(groupCategoryIds);
    return byDirection.filter((c) => allowed.has(c.id));
  }, [categories, formDirection, groupCategoryIds]);

  // When the chosen category is a "dues" category, the payee is a specific
  // member (so the member can see the due applied). Otherwise it is free text
  // with household + member suggestions.
  const isDuesSelected = useMemo(() => {
    const cat = categories.find((c) => c.id === formCategoryId);
    return isDuesCategoryName(cat?.name);
  }, [categories, formCategoryId]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.member_number - b.member_number),
    [members],
  );

  const memberNameById = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, memberLabel(m)]));
    return (id: string | null) => (id ? (map.get(id) ?? null) : null);
  }, [members]);

  // Clear the member link whenever the category stops being a dues category.
  useEffect(() => {
    if (!isDuesSelected) setValue('member_id', '');
  }, [isDuesSelected, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (!client || !selectedId) return;
    setFormError(null);
    // For a dues payment, label the ledger entry with the member so it reads
    // clearly and stays searchable even without joining the members table.
    const input = toTransactionInput(selectedId, values);
    if (isDuesSelected && input.member_id) {
      input.payee = memberNameById(input.member_id) ?? input.payee;
    } else {
      input.member_id = null;
    }
    try {
      await recordSubAccountTransaction(client, input);
      reset({ ...emptyDefaults, direction: values.direction });
      await loadLedger();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'We could not save this entry.');
    }
  });

  const selected = subAccounts.find((s) => s.id === selectedId) ?? null;

  function exportCsv() {
    if (!selected) return;
    const csv = transactionsToCsv(visible, lookups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.slug}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div>
        <div className="rule-gold mb-4 w-16" aria-hidden="true" />
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Sub-accounts</h1>
        <p className="mt-4 text-body-sm text-muted-foreground">Loading your sub-accounts…</p>
      </div>
    );
  }

  if (subAccounts.length === 0) {
    return (
      <div>
        <div className="rule-gold mb-4 w-16" aria-hidden="true" />
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Sub-accounts</h1>
        <p className="mt-4 text-body-sm text-muted-foreground">
          You are not assigned to a group sub-account. Ask a System Admin to assign you.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Sub-accounts</h1>
        {subAccounts.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sub-account" className="sr-only">
              Group
            </label>
            <select
              id="sub-account"
              className={FIELD}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {subAccounts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {selected ? (
        <p className="mt-1 text-body-sm text-muted-foreground">{selected.name}</p>
      ) : null}

      {/* Balance + month-to-date summary cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line-200 bg-surface-0 p-4">
          <p className="text-caption font-medium text-ink-500">Current balance</p>
          <p className="mt-1 font-serif text-h2 font-semibold text-brand-900 tabular-nums">
            {formatUSD(allTotals.balance)}
          </p>
        </div>
        <div className="rounded-lg border border-line-200 bg-surface-0 p-4">
          <p className="text-caption font-medium text-ink-500">Income this month</p>
          <p className="mt-1 font-serif text-h2 font-semibold text-success tabular-nums">
            {formatUSD(mtd.income)}
          </p>
        </div>
        <div className="rounded-lg border border-line-200 bg-surface-0 p-4">
          <p className="text-caption font-medium text-ink-500">Spent this month</p>
          <p className="mt-1 font-serif text-h2 font-semibold text-warning tabular-nums">
            {formatUSD(mtd.expense)}
          </p>
        </div>
      </div>

      {/* Inline income/expense record form (managers only) */}
      {canManage ? (
        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-lg border border-line-200 bg-surface-0 p-4"
          noValidate
          aria-label="Record a transaction"
        >
          <h2 className="font-serif text-h3 font-semibold text-brand-900">Record a transaction</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
              <label htmlFor="direction" className="text-caption font-medium text-ink-700">
                Type
              </label>
              <select
                id="direction"
                className={FIELD}
                {...register('direction')}
                aria-invalid={!!errors.direction}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              {errors.direction ? (
                <p className="text-caption text-destructive">{errors.direction.message}</p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="amount" className="text-caption font-medium text-ink-700">
                Amount (USD)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register('amount')}
                aria-invalid={!!errors.amount}
              />
              {errors.amount ? (
                <p className="text-caption text-destructive">{errors.amount.message}</p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="txn_date" className="text-caption font-medium text-ink-700">
                Date
              </label>
              <Input
                id="txn_date"
                type="date"
                {...register('txn_date')}
                aria-invalid={!!errors.txn_date}
              />
              {errors.txn_date ? (
                <p className="text-caption text-destructive">{errors.txn_date.message}</p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="category_id" className="text-caption font-medium text-ink-700">
                Category <span className="text-muted-foreground">(optional)</span>
              </label>
              <select id="category_id" className={FIELD} {...register('category_id')}>
                <option value="">No category</option>
                {formCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="payee" className="text-caption font-medium text-ink-700">
                {isDuesSelected ? (
                  'Member'
                ) : (
                  <>
                    Payee / source <span className="text-muted-foreground">(optional)</span>
                  </>
                )}
              </label>
              {isDuesSelected ? (
                <select
                  id="member_id"
                  className={FIELD}
                  {...register('member_id')}
                  aria-label="Member paying dues"
                >
                  <option value="">Select a member</option>
                  {sortedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {memberLabel(m)}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <Input id="payee" list="payee-options" {...register('payee')} />
                  <datalist id="payee-options">
                    {households.map((h) => (
                      <option key={`h-${h.id}`} value={h.name} />
                    ))}
                    {sortedMembers.map((m) => (
                      <option key={`m-${m.id}`} value={memberLabel(m)} />
                    ))}
                  </datalist>
                </>
              )}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="description" className="text-caption font-medium text-ink-700">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input id="description" {...register('description')} />
            </div>
          </div>

          {formError ? (
            <p role="alert" className="mt-3 text-body-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="mt-4">
            <Button type="submit" disabled={isSubmitting}>
              <Plus aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Add entry'}
            </Button>
          </div>
        </form>
      ) : null}

      {/* Transaction ledger */}
      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-h3 font-semibold text-brand-900">Transactions</h2>
          <Button variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
            <Download aria-hidden="true" /> Export CSV
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="txn-search" className="text-caption font-medium text-ink-700">
              Search
            </label>
            <Input
              id="txn-search"
              placeholder="Payee, category, description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="txn-direction" className="text-caption font-medium text-ink-700">
              Type
            </label>
            <select
              id="txn-direction"
              className={FIELD}
              value={direction}
              onChange={(e) =>
                setDirectionFilter(e.target.value as SubAccountTxnDirection | 'all')
              }
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-body-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-4">
          {visible.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No transactions match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payee / source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="tabular-nums">{t.txn_date}</TableCell>
                    <TableCell className="capitalize">{t.direction}</TableCell>
                    <TableCell>{lookups.categoryName(t.category_id)}</TableCell>
                    <TableCell>{t.payee ?? '—'}</TableCell>
                    <TableCell
                      className={
                        t.direction === 'income'
                          ? 'text-right tabular-nums text-success'
                          : 'text-right tabular-nums text-warning'
                      }
                    >
                      {t.direction === 'income' ? '+' : '−'}
                      {formatUSD(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Monthly summary (stories 6.4 / 6.5) */}
      {selected ? (
        <MonthlySummaryPanel
          subAccount={selected}
          reports={reports}
          canManage={canManage}
          onSubmitted={loadLedger}
        />
      ) : null}
    </div>
  );
}
