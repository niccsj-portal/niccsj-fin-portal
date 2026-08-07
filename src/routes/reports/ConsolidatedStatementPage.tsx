import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { listCategories, listContributions } from '@/lib/contributions/api';
import { buildLookups, formatUSD } from '@/lib/contributions/search';
import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import { listExpenses } from '@/lib/expenses/api';
import type { ExpenseRow } from '@/lib/expenses/types';
import { listAllSubAccountReports } from '@/lib/reports/api';
import {
  consolidatedStatement,
  contributionsInRange,
  expensesInRange,
  periodRange,
  subAccountRollups,
} from '@/lib/reports/aggregate';
import { consolidatedStatementToCsv } from '@/lib/reports/csv';
import type { ReportPeriod } from '@/lib/reports/types';
import { listSubAccounts } from '@/lib/subAccounts/api';
import type { SubAccountReportRow, SubAccountRow } from '@/lib/subAccounts/types';
import { KpiCard } from '@/routes/reports/KpiCard';
import { PeriodSelector } from '@/routes/reports/PeriodSelector';
import { downloadCsv, printReport } from '@/routes/reports/exportReport';

/**
 * Consolidated Financial Statement (story 11.10; PRD §4.5/§4.6/§7). One
 * printable, whole-parish statement for community meetings: the general/main
 * ledger (income by category + approved expense) plus every CMO/CWO sub-account
 * rollup, ending in a parish-wide grand total. Read-only over Sprint 4–7 data;
 * RLS is the authoritative boundary — FS / Treasurer / Admin already read both
 * the main ledger and every sub-account snapshot, so the SPA never widens
 * access. Charts are omitted deliberately: this is a figures statement meant to
 * print cleanly. Exports to CSV or PDF (browser print).
 */
export function ConsolidatedStatementPage() {
  const { client } = useAuth();
  const now = new Date();

  const [period, setPeriod] = useState<ReportPeriod>({
    kind: 'year',
    year: now.getFullYear(),
  });
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccountRow[]>([]);
  const [reports, setReports] = useState<SubAccountReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setError('The statement is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [contribs, exps, cats, subs, reportRows] = await Promise.all([
        listContributions(client, { activeOnly: true }),
        listExpenses(client, { activeOnly: true }),
        listCategories(client),
        listSubAccounts(client),
        listAllSubAccountReports(client),
      ]);
      setContributions(contribs);
      setExpenses(exps);
      setCategories(cats);
      setSubAccounts(subs);
      setReports(reportRows);
    } catch {
      setError('We could not load the statement data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const range = useMemo(() => periodRange(period), [period]);
  const lookups = useMemo(() => buildLookups(categories, [], []), [categories]);

  const rollups = useMemo(
    () => subAccountRollups(reports, subAccounts, period),
    [reports, subAccounts, period],
  );

  const statement = useMemo(
    () =>
      consolidatedStatement({
        periodLabel: range.label,
        contributions: contributionsInRange(contributions, range),
        expenses: expensesInRange(expenses, range),
        categoryName: lookups.categoryName,
        rollups,
      }),
    [contributions, expenses, range, lookups, rollups],
  );

  function exportCsv() {
    const csv = consolidatedStatementToCsv(statement);
    downloadCsv(`consolidated-statement-${range.start}-to-${range.end}.csv`, csv);
  }

  return (
    <div className="print-region">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">
          Consolidated financial statement
        </h1>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download aria-hidden="true" /> Export CSV
          </Button>
          <Button variant="outline" onClick={printReport}>
            <Printer aria-hidden="true" /> Export PDF
          </Button>
        </div>
      </div>
      <p className="mt-2 text-body text-ink-700">
        General account and all CMO/CWO sub-accounts for <strong>{range.label}</strong>.
      </p>

      <div className="no-print mt-6">
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <p className="mt-6 text-body-sm text-muted-foreground">Loading statement…</p>
      ) : error ? (
        <p role="alert" className="mt-6 text-body-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total income (parish-wide)"
              value={formatUSD(statement.grand.income)}
              tone="positive"
            />
            <KpiCard label="Total expense (parish-wide)" value={formatUSD(statement.grand.expense)} />
            <KpiCard
              label="Net position"
              value={formatUSD(statement.grand.net)}
              tone={statement.grand.net < 0 ? 'negative' : 'positive'}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>General account — {range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statement.main.categories.length === 0 ? (
                <p className="text-body-sm text-ink-700">
                  No general contributions recorded for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.main.categories.map((c) => (
                      <TableRow key={c.categoryId ?? c.name}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(c.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Total general income</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(statement.main.income)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Less: approved expenses</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ({formatUSD(statement.main.expense)})
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-semibold">
                      <TableCell>General net balance</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(statement.main.net)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sub-accounts (CMO / CWO) — {range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statement.subAccounts.length === 0 ? (
                <p className="text-body-sm text-ink-700">
                  No submitted sub-account reports for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expense</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.subAccounts.map((r) => (
                      <TableRow key={r.subAccountId}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(r.opening)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(r.income)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(r.expense)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(r.closing)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>All sub-accounts</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(statement.subTotal.opening)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(statement.subTotal.income)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(statement.subTotal.expense)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(statement.subTotal.closing)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Parish-wide total — {range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Total income (general + groups)</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUSD(statement.grand.income)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Total expense (general + groups)</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUSD(statement.grand.expense)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell>Net position</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUSD(statement.grand.net)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
