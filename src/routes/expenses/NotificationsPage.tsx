import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { listExpenses, listNotifications, markNotificationRead } from '@/lib/expenses/api';
import { formatUSD } from '@/lib/expenses/search';
import type { ExpenseNotificationRow, ExpenseRow } from '@/lib/expenses/types';

/**
 * Finance Council notification feed (story 5.7; PRD §4.4, §4.7). In-app for v1
 * (email follows in v1.5). Lists the caller's expense notifications newest
 * first with the related expense summary, and lets them mark each one read.
 */
export function NotificationsPage() {
  const { client } = useAuth();

  const [notifications, setNotifications] = useState<ExpenseNotificationRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setError('Notifications are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [notes, exp] = await Promise.all([
        listNotifications(client),
        listExpenses(client, { activeOnly: true }),
      ]);
      setNotifications(notes);
      setExpenses(exp);
    } catch {
      setError('We could not load your notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const expenseById = useMemo(
    () => new Map(expenses.map((e) => [e.id, e])),
    [expenses],
  );

  const onMarkRead = useCallback(
    async (id: string) => {
      if (!client) return;
      try {
        await markNotificationRead(client, id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
      } catch {
        // Non-fatal: leave the row as-is; the next load will reconcile.
      }
    },
    [client],
  );

  return (
    <div className="max-w-3xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Notifications</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Expense activity you&rsquo;ve been notified about.
      </p>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-body-sm text-muted-foreground">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No notifications yet. You&rsquo;ll be notified here when an expense is submitted.
          </p>
        ) : (
          <ul className="grid gap-2">
            {notifications.map((n) => {
              const expense = expenseById.get(n.expense_id);
              return (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border border-line-200 p-3 ${
                    n.is_read ? 'bg-surface-0' : 'bg-surface-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <BellRing
                      aria-hidden="true"
                      className={`mt-0.5 h-4 w-4 ${n.is_read ? 'text-ink-500' : 'text-accent-600'}`}
                    />
                    <div>
                      <p className="text-body-sm">
                        {expense ? (
                          <>
                            New expense: <span className="font-medium">{expense.payee}</span> ·{' '}
                            {formatUSD(expense.amount)}
                          </>
                        ) : (
                          'An expense was submitted.'
                        )}
                      </p>
                      <p className="text-caption text-muted-foreground tabular-nums">
                        {n.notified_at.slice(0, 10)}
                        {!n.is_read ? ' · Unread' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/expenses">View</Link>
                    </Button>
                    {!n.is_read ? (
                      <Button variant="outline" size="sm" onClick={() => void onMarkRead(n.id)}>
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
