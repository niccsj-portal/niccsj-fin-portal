import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Info, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ChartWithTableToggle } from '@/components/charts/ChartWithTableToggle';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatUSD } from '@/lib/contributions/search';
import type { CategoryTotal } from '@/lib/contributions/search';
import { listExpenses } from '@/lib/expenses/api';
import type { ExpenseRow } from '@/lib/expenses/types';
import {
  listAllSubAccountReports,
  reportIncomeByCategory,
  reportIncomeMonthly,
  reportParticipation,
} from '@/lib/reports/api';
import {
  expensesInRange,
  periodRange,
  subAccountRollups,
  trendFromIncomeMap,
} from '@/lib/reports/aggregate';
import { financeReportToCsv } from '@/lib/reports/csv';
import type { Participation, ReportPeriod, SubAccountRollup } from '@/lib/reports/types';
import { listSubAccounts } from '@/lib/subAccounts/api';
import type { SubAccountReportRow, SubAccountRow } from '@/lib/subAccounts/types';
import { KpiCard } from '@/routes/reports/KpiCard';
import { PeriodSelector } from '@/routes/reports/PeriodSelector';
import { downloadCsv, printReport } from '@/routes/reports/exportReport';

const ZERO_PARTICIPATION: Participation = { contributing: 0, total: 0, rate: 0 };

/**
 * Finance Council Oversight Dashboard (stories 7.2 + 7.5; UX §5.6, PRD §4.6/§7).
 * Read-only and strictly aggregate: income / participation / category figures
 * come from the aggregate-only RPCs (migration 20260630170000) — the Council is
 * never sent a per-member or per-household row — and the CMO/CWO rollups come
 * from the monthly `sub_account_reports` snapshots. A persistent banner states
 * the aggregate-only rule. Exports the current view to CSV or PDF.
 */
export function CouncilDashboardPage() {
  const { client } = useAuth();
  const now = new Date();

  const [period, setPeriod] = useState<ReportPeriod>({
    kind: 'year',
    year: now.getFullYear(),
  });
  const [split, setSplit] = useState<CategoryTotal[]>([]);
  const [incomeByMonth, setIncomeByMonth] = useState<Map<number, number>>(new Map());
  const [participation, setParticipation] = useState<Participation>(ZERO_PARTICIPATION);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [reports, setReports] = useState<SubAccountReportRow[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => periodRange(period), [period]);

  const load = useCallback(async () => {
    if (!client) {
      setError('Reports are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [categorySplit, monthly, participationRows, exps, subs, reportRows] =
        await Promise.all([
          reportIncomeByCategory(client, range.start, range.end),
          reportIncomeMonthly(client, period.year),
          reportParticipation(client, range.start, range.end),
          listExpenses(client, { activeOnly: true }),
          listSubAccounts(client),
          listAllSubAccountReports(client),
        ]);
      setSplit(categorySplit);
      setIncomeByMonth(monthly);
      setParticipation(participationRows);
      setExpenses(exps);
      setSubAccounts(subs);
      setReports(reportRows);
    } catch {
      setError('We could not load the oversight data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client, range.start, range.end, period.year]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodExpenses = useMemo(() => expensesInRange(expenses, range), [expenses, range]);
  const income = useMemo(() => split.reduce((s, c) => s + c.total, 0), [split]);
  const approvedExpense = useMemo(
    () =>
      periodExpenses
        .filter((e) => e.status === 'approved')
        .reduce((s, e) => s + Number(e.amount), 0),
    [periodExpenses],
  );
  const pending = useMemo(
    () => periodExpenses.filter((e) => e.status === 'pending').length,
    [periodExpenses],
  );
  const trend = useMemo(
    () => trendFromIncomeMap(incomeByMonth, expenses, period.year),
    [incomeByMonth, expenses, period.year],
  );
  const rollups: SubAccountRollup[] = useMemo(
    () => subAccountRollups(reports, subAccounts, period),
    [reports, subAccounts, period],
  );

  function exportCsv() {
    const csv = financeReportToCsv({
      title: 'Finance Council Oversight Report (aggregate only)',
      periodLabel: range.label,
      kpis: { income, expense: approvedExpense, net: income - approvedExpense, pending },
      categories: split,
      participation,
      rollups,
    });
    downloadCsv(`council-report-${range.start}-to-${range.end}.csv`, csv);
  }

  return (
    <div className="print-region">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">
          Finance Council oversight
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

      <div
        role="note"
        className="mt-4 flex items-start gap-2 rounded-md border border-brand-200 bg-brand-50 p-3 text-body-sm text-brand-900"
      >
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Aggregate figures only.</strong> This oversight view shows totals and rollups.
          It never displays per-member or per-household detail (PRD §7).
        </span>
      </div>

      <p className="mt-4 text-body text-ink-700">
        Aggregate figures for <strong>{range.label}</strong>.
      </p>

      <div className="no-print mt-6">
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <p className="mt-6 text-body-sm text-muted-foreground">Loading oversight data…</p>
      ) : error ? (
        <p role="alert" className="mt-6 text-body-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Income" value={formatUSD(income)} tone="positive" />
            <KpiCard label="Expense" value={formatUSD(approvedExpense)} />
            <KpiCard
              label="Net balance"
              value={formatUSD(income - approvedExpense)}
              tone={income - approvedExpense < 0 ? 'negative' : 'positive'}
            />
            <KpiCard
              label="Participation"
              value={`${Math.round(participation.rate * 100)}%`}
              hint={`${participation.contributing} of ${participation.total} households`}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Income vs. expense — {period.year}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartWithTableToggle
                ariaLabel={`Monthly income and expense for ${period.year}`}
                chart={
                  <MonthlyTrendChart
                    data={trend}
                    ariaLabel={`Monthly income and expense for ${period.year}`}
                  />
                }
                table={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expense</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trend.map((t) => (
                        <TableRow key={t.month}>
                          <TableCell>{t.label}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatUSD(t.income)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatUSD(t.expense)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Income by category — {range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {split.length === 0 ? (
                <p className="text-body-sm text-ink-700">
                  No contributions recorded for this period.
                </p>
              ) : (
                <ChartWithTableToggle
                  ariaLabel={`Income by category for ${range.label}`}
                  chart={
                    <CategoryBarChart
                      data={split}
                      ariaLabel={`Income by category for ${range.label}`}
                    />
                  }
                  table={
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Income</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {split.map((c) => (
                          <TableRow key={c.categoryId}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatUSD(c.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sub-account rollups — {range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {rollups.length === 0 ? (
                <p className="text-body-sm text-ink-700">
                  No sub-account summaries submitted for this period.
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
                    {rollups.map((r) => (
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
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
