import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { submitSubAccountReport } from '@/lib/subAccounts/api';
import { formatUSD, periodLabel } from '@/lib/subAccounts/search';
import type { SubAccountReportRow, SubAccountRow } from '@/lib/subAccounts/types';
import { ReportStatusChip } from '@/routes/sub-accounts/ReportStatusChip';

interface Props {
  subAccount: SubAccountRow;
  reports: SubAccountReportRow[];
  canManage: boolean;
  onSubmitted: () => void | Promise<void>;
}

/**
 * Monthly summary panel (stories 6.4 / 6.5; PRD §4.5). Lists the immutable
 * monthly snapshots (opening / income / expense / closing) with a status chip,
 * and — for the assigned manager — a button to submit the current month. The
 * snapshot itself is computed and written server-side by the
 * `submit-sub-account-report` Edge Function; the panel only triggers it and
 * reloads.
 */
export function MonthlySummaryPanel({ subAccount, reports, canManage, onSubmitted }: Props) {
  const { client } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitThisMonth() {
    if (!client) return;
    setError(null);
    setSubmitting(true);
    try {
      const now = new Date();
      await submitSubAccountReport(client, {
        sub_account_id: subAccount.id,
        period_year: now.getFullYear(),
        period_month: now.getMonth() + 1,
      });
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not submit this summary.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-h3 font-semibold text-brand-900">Monthly summary</h2>
        {canManage ? (
          <Button onClick={submitThisMonth} disabled={submitting}>
            {submitting ? 'Submitting…' : "Submit this month's summary"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {reports.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No monthly summaries submitted yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{periodLabel(r.period_year, r.period_month)}</TableCell>
                  <TableCell>
                    <ReportStatusChip status={r.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(r.opening_balance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    {formatUSD(r.total_income)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-warning">
                    {formatUSD(r.total_expense)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatUSD(r.closing_balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
