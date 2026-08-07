import { sumByCategory, type CategoryTotal } from '@/lib/contributions/search';
import type { ContributionRow } from '@/lib/contributions/types';
import type { ExpenseRow } from '@/lib/expenses/types';
import type { HouseholdRow } from '@/lib/members/types';
import type { SubAccountReportRow, SubAccountRow } from '@/lib/subAccounts/types';
import type {
  DateRange,
  FinanceKpis,
  Participation,
  ReportPeriod,
  SubAccountRollup,
  TrendPoint,
  ConsolidatedStatement,
} from '@/lib/reports/types';

/**
 * Pure aggregation over the (small) contributions / expenses / sub-account
 * report sets (Sprint 7; PRD §4.6). Every function is deterministic and free of
 * I/O so the dashboards stay declarative and the maths is unit-testable with
 * plain fixtures. RLS (Sprints 4–6) is the authorization boundary — these
 * helpers only shape rows the server already returned. The Council path is
 * deliberately aggregate-only: no function here ever emits a per-member row.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Last calendar day (28–31) of a given 1-based month. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * The inclusive ISO date range + label for a selected period (story 7.4). Used
 * to scope contributions (`contribution_date`) and expenses (`expense_date`).
 */
export function periodRange(period: ReportPeriod): DateRange {
  const { kind, year } = period;
  if (kind === 'month') {
    const month = period.month ?? 1;
    return {
      start: `${year}-${pad2(month)}-01`,
      end: `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`,
      label: `${MONTH_NAMES[month - 1] ?? month} ${year}`,
    };
  }
  if (kind === 'quarter') {
    const quarter = period.quarter ?? 1;
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return {
      start: `${year}-${pad2(startMonth)}-01`,
      end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
      label: `Q${quarter} ${year}`,
    };
  }
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: String(year),
  };
}

/** Whether an ISO `YYYY-MM-DD` date falls within an inclusive range. */
export function inRange(date: string, range: DateRange): boolean {
  const day = date.slice(0, 10);
  return day >= range.start && day <= range.end;
}

export function contributionsInRange(
  rows: ContributionRow[],
  range: DateRange,
): ContributionRow[] {
  return rows.filter((r) => inRange(r.contribution_date, range));
}

export function expensesInRange(rows: ExpenseRow[], range: DateRange): ExpenseRow[] {
  return rows.filter((r) => inRange(r.expense_date, range));
}

function sumAmounts(rows: Array<{ amount: number }>): number {
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

/**
 * Headline finance KPIs for the already-period-scoped sets (story 7.1). Income
 * is total contributions; expense is the sum of *approved* expenses only (actual
 * outflow); net = income − approved expense; pending is the count of expenses
 * still awaiting a decision.
 */
export function financeKpis(
  contributions: ContributionRow[],
  expenses: ExpenseRow[],
): FinanceKpis {
  const income = sumAmounts(contributions);
  const expense = sumAmounts(expenses.filter((e) => e.status === 'approved'));
  const pending = expenses.filter((e) => e.status === 'pending').length;
  return { income, expense, net: income - expense, pending };
}

/** Per-category income split, descending by total (reuses the ledger roll-up). */
export function categorySplit(
  contributions: ContributionRow[],
  categoryName: (id: string) => string,
): CategoryTotal[] {
  return sumByCategory(contributions, { categoryName });
}

/**
 * The 12-month income-vs-expense trend for a calendar year (story 7.1). Income
 * from all contributions; expense from approved expenses. Rows outside `year`
 * are ignored, so callers can pass the full unscoped set.
 */
export function monthlyTrend(
  contributions: ContributionRow[],
  expenses: ExpenseRow[],
  year: number,
): TrendPoint[] {
  const income = new Array(12).fill(0) as number[];
  const expense = new Array(12).fill(0) as number[];
  for (const c of contributions) {
    if (c.contribution_date.slice(0, 4) === String(year)) {
      const m = Number(c.contribution_date.slice(5, 7));
      if (m >= 1 && m <= 12) income[m - 1] += Number(c.amount);
    }
  }
  for (const e of expenses) {
    if (e.status === 'approved' && e.expense_date.slice(0, 4) === String(year)) {
      const m = Number(e.expense_date.slice(5, 7));
      if (m >= 1 && m <= 12) expense[m - 1] += Number(e.amount);
    }
  }
  return MONTH_ABBR.map((label, i) => ({
    month: i + 1,
    label,
    income: income[i],
    expense: expense[i],
  }));
}

/**
 * The 12-bucket income trend for a calendar year built from the aggregate
 * income-by-month RPC (story 7.2) rather than raw rows — used by the Finance
 * Council view, which never receives per-contribution rows. Expense figures come
 * from the (RLS-permitted) approved expenses. Any month absent from the map is 0.
 */
export function trendFromIncomeMap(
  incomeByMonth: Map<number, number>,
  expenses: ExpenseRow[],
  year: number,
): TrendPoint[] {
  const expense = new Array(12).fill(0) as number[];
  for (const e of expenses) {
    if (e.status === 'approved' && e.expense_date.slice(0, 4) === String(year)) {
      const m = Number(e.expense_date.slice(5, 7));
      if (m >= 1 && m <= 12) expense[m - 1] += Number(e.amount);
    }
  }
  return MONTH_ABBR.map((label, i) => ({
    month: i + 1,
    label,
    income: incomeByMonth.get(i + 1) ?? 0,
    expense: expense[i],
  }));
}

/**
 * Contribution participation (story 7.2): the count of distinct households that
 * gave at least once in the (already period-scoped) set, over the total number
 * of supplied households. This is an aggregate figure — no household is named.
 */
export function participationRate(
  households: HouseholdRow[],
  contributions: ContributionRow[],
): Participation {
  const contributing = new Set<string>();
  for (const c of contributions) {
    if (c.household_id) contributing.add(c.household_id);
  }
  const total = households.length;
  return {
    contributing: contributing.size,
    total,
    rate: total > 0 ? contributing.size / total : 0,
  };
}

/** Whether a report's period falls within the selected reporting period. */
function reportInPeriod(report: SubAccountReportRow, period: ReportPeriod): boolean {
  if (report.period_year !== period.year) return false;
  if (period.kind === 'month') return report.period_month === (period.month ?? 1);
  if (period.kind === 'quarter') {
    const quarter = period.quarter ?? 1;
    const startMonth = (quarter - 1) * 3 + 1;
    return report.period_month >= startMonth && report.period_month <= startMonth + 2;
  }
  return true;
}

/**
 * Per-group sub-account rollups for the Council dashboard (story 7.5), derived
 * from `sub_account_reports` snapshots only. For a single month the group's
 * opening/closing come from that report; for a quarter/year they span the
 * earliest report's opening to the latest report's closing, with income/expense
 * summed across the periods. Groups with no report in range are omitted.
 * Deliberately rollup-only: no transaction or member detail is produced.
 */
export function subAccountRollups(
  reports: SubAccountReportRow[],
  subAccounts: SubAccountRow[],
  period: ReportPeriod,
): SubAccountRollup[] {
  const nameOf = new Map(subAccounts.map((s) => [s.id, s.name]));
  const byAccount = new Map<string, SubAccountReportRow[]>();
  for (const r of reports) {
    if (!reportInPeriod(r, period)) continue;
    const list = byAccount.get(r.sub_account_id) ?? [];
    list.push(r);
    byAccount.set(r.sub_account_id, list);
  }

  const rollups: SubAccountRollup[] = [];
  for (const [subAccountId, group] of byAccount) {
    const ordered = [...group].sort((a, b) => a.period_month - b.period_month);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    rollups.push({
      subAccountId,
      name: nameOf.get(subAccountId) ?? subAccountId,
      opening: Number(first.opening_balance),
      income: ordered.reduce((s, r) => s + Number(r.total_income), 0),
      expense: ordered.reduce((s, r) => s + Number(r.total_expense), 0),
      closing: Number(last.closing_balance),
    });
  }
  return rollups.sort((a, b) => a.name.localeCompare(b.name));
}

/** Recent years for the period selector, current year first. */
export function reportYears(count = 5): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}

/**
 * The consolidated financial statement (story 11.10; PRD §4.5/§4.6/§7). Combines
 * the general/main ledger (contribution income by category + approved expense)
 * with every CMO/CWO sub-account rollup and computes a parish-wide grand total.
 * Pure: callers pass rows already period-scoped and RLS-permitted; this only
 * shapes them. Grand income/expense add the general figures to the sum of every
 * group's income/expense so the total reflects the whole parish position.
 */
export function consolidatedStatement(input: {
  periodLabel: string;
  contributions: ContributionRow[];
  expenses: ExpenseRow[];
  categoryName: (id: string) => string;
  rollups: SubAccountRollup[];
}): ConsolidatedStatement {
  const { periodLabel, contributions, expenses, categoryName, rollups } = input;
  const kpis = financeKpis(contributions, expenses);
  const categories = categorySplit(contributions, categoryName);

  const subTotal = rollups.reduce(
    (acc, r) => ({
      opening: acc.opening + r.opening,
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      closing: acc.closing + r.closing,
    }),
    { opening: 0, income: 0, expense: 0, closing: 0 },
  );

  const grandIncome = kpis.income + subTotal.income;
  const grandExpense = kpis.expense + subTotal.expense;

  return {
    periodLabel,
    main: {
      income: kpis.income,
      expense: kpis.expense,
      net: kpis.net,
      pending: kpis.pending,
      categories,
    },
    subAccounts: rollups,
    subTotal,
    grand: {
      income: grandIncome,
      expense: grandExpense,
      net: grandIncome - grandExpense,
    },
  };
}
