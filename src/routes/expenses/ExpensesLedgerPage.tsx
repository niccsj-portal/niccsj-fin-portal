import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';

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
import { canApproveExpenses, canRecordExpenses } from '@/lib/auth/roles';
import { listCategories } from '@/lib/contributions/api';
import type { CategoryRow } from '@/lib/contributions/types';
import { listExpenses } from '@/lib/expenses/api';
import { getReceiptSignedUrl } from '@/lib/expenses/storage';
import type { ExpenseRow, ExpenseStatus } from '@/lib/expenses/types';
import {
  buildExpenseLookups,
  filterExpenses,
  formatUSD,
  totalExpenses,
  type ExpenseFilter,
} from '@/lib/expenses/search';
import { ExpenseStatusChip } from '@/routes/expenses/ExpenseStatusChip';

/** Short-form for the decided-at timestamp; falls back to raw ISO on parse failure. */
function formatDecidedAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Expense ledger (story 5.5; PRD §4.4). The "notified" set (FS / Treasurer /
 * Chaplain / Finance Council / Admin) sees every expense with status chips and
 * rejection reasons; filters by status / category and a free-text search refine
 * the list client-side. Recorders (Treasurer / Admin) get a Record button;
 * approvers (Chaplain / Admin) get a link to the approval queue. RLS is the
 * real boundary (PRD §7).
 */
export function ExpensesLedgerPage() {
  const { client, role } = useAuth();
  const canRecord = canRecordExpenses(role);
  const canApprove = canApproveExpenses(role);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ExpenseStatus | 'all'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setError('Expenses are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [expenses, cats] = await Promise.all([
        listExpenses(client, { activeOnly: true }),
        listCategories(client, { type: 'expense' }),
      ]);
      setRows(expenses);
      setCategories(cats);
    } catch {
      setError('We could not load expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const lookups = useMemo(() => buildExpenseLookups(categories), [categories]);

  const filter: ExpenseFilter = useMemo(
    () => ({
      status,
      categoryId: categoryId || undefined,
      search,
    }),
    [status, categoryId, search],
  );

  const visible = useMemo(() => filterExpenses(rows, filter, lookups), [rows, filter, lookups]);
  const total = useMemo(() => totalExpenses(visible), [visible]);
  const pendingCount = useMemo(() => rows.filter((r) => r.status === 'pending').length, [rows]);

  const openDetail = useCallback(
    async (expense: ExpenseRow) => {
      setSelected(expense);
      setReceiptUrl(null);
      setReceiptError(null);
      if (client && expense.receipt_path) {
        try {
          setReceiptUrl(await getReceiptSignedUrl(client, expense.receipt_path));
        } catch {
          setReceiptError('The receipt link could not be prepared.');
        }
      }
    },
    [client],
  );

  const closeDetail = useCallback(() => {
    setSelected(null);
    setReceiptUrl(null);
    setReceiptError(null);
  }, []);

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Expenses</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove ? (
            <Button asChild variant="outline">
              <Link to="/expenses/approvals">
                <ClipboardCheck aria-hidden="true" /> Approval queue
                {pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Link>
            </Button>
          ) : null}
          {canRecord ? (
            <Button asChild>
              <Link to="/expenses/new">
                <Plus aria-hidden="true" /> Record expense
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-search" className="text-caption font-medium text-ink-700">
            Search
          </label>
          <Input
            id="expense-search"
            placeholder="Payee, category, description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-status" className="text-caption font-medium text-ink-700">
            Status
          </label>
          <select
            id="expense-status"
            className={FIELD}
            value={status}
            onChange={(e) => setStatus(e.target.value as ExpenseStatus | 'all')}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-category" className="text-caption font-medium text-ink-700">
            Category
          </label>
          <select
            id="expense-category"
            className={FIELD}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-body-sm text-muted-foreground">Loading expenses…</p>
        ) : visible.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No expenses match your filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums">{e.expense_date}</TableCell>
                  <TableCell>{e.payee}</TableCell>
                  <TableCell>{lookups.categoryName(e.category_id)}</TableCell>
                  <TableCell>
                    <ExpenseStatusChip status={e.status} />
                    {e.status === 'rejected' && e.rejection_reason ? (
                      <span className="ml-2 text-caption text-warning">
                        {e.rejection_reason}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(e.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void openDetail(e)}
                      aria-label={`View details for ${e.payee}`}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatUSD(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => (open ? undefined : closeDetail())}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Expense details</DialogTitle>
                <DialogDescription>
                  {selected.payee} · {lookups.categoryName(selected.category_id)} ·{' '}
                  {formatUSD(selected.amount)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-body-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ExpenseStatusChip status={selected.status} />
                </dd>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="tabular-nums">{selected.expense_date}</dd>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="tabular-nums">{formatUSD(selected.amount)}</dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{lookups.categoryName(selected.category_id)}</dd>
                <dt className="text-muted-foreground">Payee</dt>
                <dd>{selected.payee}</dd>
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
                    ) : receiptError ? (
                      <span className="text-warning">{receiptError}</span>
                    ) : (
                      'Preparing receipt link…'
                    )
                  ) : (
                    'No receipt attached'
                  )}
                </dd>
                {selected.status !== 'pending' ? (
                  <>
                    <dt className="text-muted-foreground">Decided</dt>
                    <dd className="tabular-nums">{formatDecidedAt(selected.decided_at)}</dd>
                  </>
                ) : null}
                {selected.status === 'rejected' ? (
                  <>
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="text-warning">{selected.rejection_reason || '—'}</dd>
                  </>
                ) : null}
              </dl>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={closeDetail}>
                  Close
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
