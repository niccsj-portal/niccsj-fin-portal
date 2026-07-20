import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';

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
import { listCategories, listContributions } from '@/lib/contributions/api';
import { buildLookups, formatUSD } from '@/lib/contributions/search';
import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import { listExpenses } from '@/lib/expenses/api';
import { buildExpenseLookups } from '@/lib/expenses/search';
import type { ExpenseRow } from '@/lib/expenses/types';
import {
  categorySplit,
  contributionsInRange,
  expensesInRange,
  financeKpis,
  monthlyTrend,
  periodRange,
} from '@/lib/reports/aggregate';
import { financeReportToCsv } from '@/lib/reports/csv';
import type { ReportPeriod } from '@/lib/reports/types';
import { ExpenseStatusChip } from '@/routes/expenses/ExpenseStatusChip';
import { KpiCard } from '@/routes/reports/KpiCard';
import { PeriodSelector } from '@/routes/reports/PeriodSelector';
import { downloadCsv, printReport } from '@/routes/reports/exportReport';

/**
 * Treasurer Finance Dashboard (story 7.1; UX §5.3, PRD §4.6). Aggregate KPIs
 * (Income / Expense / Net / Pending) over a selectable period, an income-vs-
 * expense trend, a category income split, and a period-scoped expenses table.
 * Every chart carries a "View as table" fallback (NFR §5). Reuses the privileged-
 * reader / expense-reader RLS scope — the SPA never widens access. Exports the
 * current view to CSV or PDF (browser print).
 */
export function TreasurerDashboardPage() {
  const { client } = useAuth();
  const now = new Date();

  const [period, setPeriod] = useState<ReportPeriod>({
    kind: 'year',
    year: now.getFullYear(),
  });
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setError('Reports are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [contribs, exps, cats] = await Promise.all([
        listContributions(client, { activeOnly: true }),
        listExpenses(client, { activeOnly: true }),
        listCategories(client),
      ]);
      setContributions(contribs);
      setExpenses(exps);
      setCategories(cats);
    } catch {
      setError('We could not load the report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const range = useMemo(() => periodRange(period), [period]);
  const contribLookups = useMemo(() => buildLookups(categories, [], []), [categories]);
  const expenseLookups = useMemo(() => buildExpenseLookups(categories), [categories]);

  const periodContribs = useMemo(
    () => contributionsInRange(contributions, range),
    [contributions, range],
  );
  const periodExpenses = useMemo(
    () => expensesInRange(expenses, range),
    [expenses, range],
  );
  const kpis = useMemo(
    () => financeKpis(periodContribs, periodExpenses),
    [periodContribs, periodExpenses],
  );
  const split = useMemo(
    () => categorySplit(periodContribs, contribLookups.categoryName),
    [periodContribs, contribLookups],
  );
  const trend = useMemo(
    () => monthlyTrend(contributions, expenses, period.year),
    [contributions, expenses, period.year],
  );

  function exportCsv() {
    const csv = financeReportToCsv({
      title: 'Treasurer Finance Report',
      periodLabel: range.label,
      kpis,
      categories: split,
    });
    downloadCsv(`finance-report-${range.start}-to-${range.end}.csv`, csv);
  }

  return (
    <div className="print-region">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Finance dashboard</h1>
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
        Aggregate figures for <strong>{range.label}</strong>.
      </p>

      <div className="no-print mt-6">
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <p className="mt-6 text-body-sm text-muted-foreground">Loading report…</p>
      ) : error ? (
        <p role="alert" className="mt-6 text-body-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Income" value={formatUSD(kpis.income)} tone="positive" />
            <KpiCard label="Expense" value={formatUSD(kpis.expense)} />
            <KpiCard
              label="Net balance"
              value={formatUSD(kpis.net)}
              tone={kpis.net < 0 ? 'negative' : 'positive'}
            />
            <KpiCard
              label="Pending approvals"
              value={String(kpis.pending)}
              hint={kpis.pending === 1 ? '1 expense awaiting a decision' : 'expenses awaiting a decision'}
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
              <CardTitle>Expenses — {range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {periodExpenses.length === 0 ? (
                <p className="text-body-sm text-ink-700">No expenses recorded for this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="tabular-nums">{e.expense_date}</TableCell>
                        <TableCell>{e.payee}</TableCell>
                        <TableCell>{expenseLookups.categoryName(e.category_id)}</TableCell>
                        <TableCell>
                          <ExpenseStatusChip status={e.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(e.amount)}
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
