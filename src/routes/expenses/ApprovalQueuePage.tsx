import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { listCategories } from '@/lib/contributions/api';
import type { CategoryRow } from '@/lib/contributions/types';
import { approveExpense, listExpenses, rejectExpense } from '@/lib/expenses/api';
import { getReceiptSignedUrl } from '@/lib/expenses/storage';
import { buildExpenseLookups, formatUSD, pendingOldestFirst } from '@/lib/expenses/search';
import { rejectionSchema, type RejectionValues } from '@/lib/expenses/validation';
import type { ExpenseRow } from '@/lib/expenses/types';

/**
 * Chaplain approval queue (story 5.6; PRD §4.4, UX §5.5). Pending expenses are
 * listed oldest first; opening one shows a detail dialog with the receipt
 * (served via a short-lived signed URL) and Approve / Reject controls. Reject
 * requires a reason (story 5.4). Only approvers (Chaplain / Admin) reach this
 * route (RequireRole + the Edge Functions + RLS all enforce it).
 */
export function ApprovalQueuePage() {
  const { client } = useAuth();

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectionValues>({ resolver: zodResolver(rejectionSchema) });

  const load = useCallback(async () => {
    if (!client) {
      setError('The approval queue is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [expenses, cats] = await Promise.all([
        listExpenses(client, { status: 'pending' }),
        listCategories(client, { type: 'expense' }),
      ]);
      setRows(expenses);
      setCategories(cats);
    } catch {
      setError('We could not load pending expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const lookups = useMemo(() => buildExpenseLookups(categories), [categories]);
  const queue = useMemo(() => pendingOldestFirst(rows), [rows]);

  const openDetail = useCallback(
    async (expense: ExpenseRow) => {
      setSelected(expense);
      setActionError(null);
      setReceiptUrl(null);
      reset({ reason: '' });
      if (client && expense.receipt_path) {
        try {
          setReceiptUrl(await getReceiptSignedUrl(client, expense.receipt_path));
        } catch {
          setReceiptUrl(null);
        }
      }
    },
    [client, reset],
  );

  const closeDetail = useCallback(() => {
    setSelected(null);
    setReceiptUrl(null);
    setActionError(null);
  }, []);

  const onApprove = useCallback(async () => {
    if (!client || !selected) return;
    setWorking(true);
    setActionError(null);
    try {
      await approveExpense(client, selected.id);
      closeDetail();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not approve the expense.');
    } finally {
      setWorking(false);
    }
  }, [client, selected, closeDetail, load]);

  const onReject = handleSubmit(async (values) => {
    if (!client || !selected) return;
    setWorking(true);
    setActionError(null);
    try {
      await rejectExpense(client, selected.id, values.reason);
      closeDetail();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not reject the expense.');
    } finally {
      setWorking(false);
    }
  });

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Approval queue</h1>
        <Button asChild variant="ghost">
          <Link to="/expenses">Back to expenses</Link>
        </Button>
      </div>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Pending expenses, oldest first. Open one to review and approve or reject.
      </p>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-body-sm text-muted-foreground">Loading pending expenses…</p>
        ) : queue.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            Nothing awaiting approval. You&rsquo;re all caught up.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums">{e.expense_date}</TableCell>
                  <TableCell>{e.payee}</TableCell>
                  <TableCell>{lookups.categoryName(e.category_id)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(e.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => void openDetail(e)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => (open ? undefined : closeDetail())}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Review expense</DialogTitle>
                <DialogDescription>
                  {selected.payee} · {lookups.categoryName(selected.category_id)} ·{' '}
                  {formatUSD(selected.amount)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-body-sm">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="tabular-nums">{selected.expense_date}</dd>
                <dt className="text-muted-foreground">Description</dt>
                <dd>{selected.description || '—'}</dd>
                <dt className="text-muted-foreground">Receipt</dt>
                <dd>
                  {selected.receipt_path ? (
                    receiptUrl ? (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-600 underline"
                      >
                        View receipt
                      </a>
                    ) : (
                      'Preparing receipt link…'
                    )
                  ) : (
                    'No receipt attached'
                  )}
                </dd>
              </dl>

              <div className="grid gap-1.5">
                <label htmlFor="reason" className="text-caption font-medium text-ink-700">
                  Rejection reason{' '}
                  <span className="text-muted-foreground">(required to reject)</span>
                </label>
                <Input id="reason" {...register('reason')} aria-invalid={!!errors.reason} />
                {errors.reason ? (
                  <p className="text-caption text-destructive">{errors.reason.message}</p>
                ) : null}
              </div>

              {actionError ? (
                <p role="alert" className="text-body-sm text-destructive">
                  {actionError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onReject} disabled={working}>
                  Reject
                </Button>
                <Button onClick={() => void onApprove()} disabled={working}>
                  {working ? 'Working…' : 'Approve'}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
