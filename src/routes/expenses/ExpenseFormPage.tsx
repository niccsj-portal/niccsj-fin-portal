import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import { listCategories } from '@/lib/contributions/api';
import type { CategoryRow } from '@/lib/contributions/types';
import { submitExpense } from '@/lib/expenses/api';
import { RECEIPT_ACCEPT, uploadReceipt } from '@/lib/expenses/storage';
import {
  expenseFormSchema,
  toExpenseInput,
  type ExpenseFormInput,
  type ExpenseFormValues,
} from '@/lib/expenses/validation';

const FIELD =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDefaults: ExpenseFormInput = {
  category_id: '',
  payee: '',
  amount: '' as unknown as number,
  expense_date: today(),
  description: '',
};

/**
 * Record an expense (story 5.5; PRD §4.4). A fresh form defaults the date to
 * today and autofocuses the payee. An optional receipt is uploaded to the
 * private bucket first (story 5.2), then the expense is submitted through the
 * `submit-expense` Edge Function which fans out notifications. Only recorders
 * (Treasurer / Admin) reach this route (RequireRole + RLS).
 */
export function ExpenseFormPage() {
  const { client } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    let active = true;
    if (!client) {
      setLoading(false);
      setFormError('The expense form is unavailable: the app is not configured.');
      return;
    }
    void (async () => {
      try {
        const cats = await listCategories(client, { type: 'expense', activeOnly: true });
        if (!active) return;
        setCategories(cats);
      } catch {
        if (active) setFormError('We could not load expense categories.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!client) return;
    setFormError(null);
    try {
      let receiptPath: string | null = null;
      if (receipt) {
        receiptPath = await uploadReceipt(client, receipt);
      }
      await submitExpense(client, toExpenseInput(values, receiptPath));
      navigate('/expenses');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'We could not submit this expense.');
    }
  });

  return (
    <div className="max-w-2xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Record expense</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">
        The Finance Council is notified when you submit. The Chaplain approves or rejects.
      </p>

      {loading ? (
        <p className="mt-6 text-body-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor="payee" className="text-caption font-medium text-ink-700">
              Payee
            </label>
            <Input id="payee" autoFocus {...register('payee')} aria-invalid={!!errors.payee} />
            {errors.payee ? (
              <p className="text-caption text-destructive">{errors.payee.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="category_id" className="text-caption font-medium text-ink-700">
                Category
              </label>
              <select
                id="category_id"
                className={FIELD}
                {...register('category_id')}
                aria-invalid={!!errors.category_id}
              >
                <option value="">Select a category</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category_id ? (
                <p className="text-caption text-destructive">{errors.category_id.message}</p>
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
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="expense_date" className="text-caption font-medium text-ink-700">
              Date
            </label>
            <Input
              id="expense_date"
              type="date"
              {...register('expense_date')}
              aria-invalid={!!errors.expense_date}
            />
            {errors.expense_date ? (
              <p className="text-caption text-destructive">{errors.expense_date.message}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="description" className="text-caption font-medium text-ink-700">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input id="description" {...register('description')} />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="receipt" className="text-caption font-medium text-ink-700">
              Receipt <span className="text-muted-foreground">(optional, max 5 MB)</span>
            </label>
            <input
              id="receipt"
              type="file"
              accept={RECEIPT_ACCEPT}
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              className="text-body-sm"
            />
          </div>

          {formError ? (
            <p role="alert" className="text-body-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit for approval'}
            </Button>
            <Button asChild variant="ghost">
              <Link to="/expenses">Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
