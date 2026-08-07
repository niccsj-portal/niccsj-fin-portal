/**
 * Reporting types (Sprint 7; PRD §4.6). Sprint 7 is read-only over data already
 * produced by Sprints 4–6 (contributions, expenses, sub-account reports); no new
 * tables are introduced. These shapes describe the period model, the aggregate
 * KPIs, the monthly trend, and the sub-account rollups consumed by the Treasurer
 * finance dashboard and the (aggregate-only) Finance Council oversight dashboard.
 */

/** The three report granularities offered by the period selector (story 7.4). */
export type PeriodKind = 'month' | 'quarter' | 'year';

export const PERIOD_KINDS: readonly PeriodKind[] = ['month', 'quarter', 'year'];

/**
 * A selected reporting period. `month` (1–12) applies when `kind === 'month'`;
 * `quarter` (1–4) applies when `kind === 'quarter'`; a `year` period spans the
 * whole calendar year.
 */
export interface ReportPeriod {
  kind: PeriodKind;
  year: number;
  month?: number;
  quarter?: number;
}

/** An inclusive ISO (`YYYY-MM-DD`) date range plus a human label for a period. */
export interface DateRange {
  start: string;
  end: string;
  label: string;
}

/** Headline finance KPIs for a period (story 7.1). `pending` is a count. */
export interface FinanceKpis {
  income: number;
  expense: number;
  net: number;
  pending: number;
}

/** One month of the income-vs-expense trend chart. */
export interface TrendPoint {
  month: number;
  label: string;
  income: number;
  expense: number;
}

/**
 * Contribution participation for a period (story 7.2): how many households gave
 * at least once, out of the total. `rate` is a 0–1 fraction.
 */
export interface Participation {
  contributing: number;
  total: number;
  rate: number;
}

/**
 * A per-group sub-account rollup for the Council dashboard (story 7.5). Derived
 * from `sub_account_reports` snapshots only — opening/income/expense/closing per
 * group, with explicitly no per-transaction or per-member drill-down.
 */
export interface SubAccountRollup {
  subAccountId: string;
  name: string;
  opening: number;
  income: number;
  expense: number;
  closing: number;
}

/**
 * The consolidated financial statement (story 11.10; PRD §4.5/§4.6/§7): the
 * general/main ledger and every CMO/CWO sub-account in one printable view for
 * community-meeting presentation. Read-only over Sprint 4–7 data — no new
 * tables. `main` is the general account; `subAccounts` are the per-group
 * rollups; `subTotal` sums them; `grand` is the parish-wide position (general
 * income/expense plus every group's income/expense). Aggregate figures only —
 * no per-member row is ever produced.
 */
export interface ConsolidatedStatement {
  periodLabel: string;
  main: {
    income: number;
    expense: number;
    net: number;
    pending: number;
    categories: import('@/lib/contributions/search').CategoryTotal[];
  };
  subAccounts: SubAccountRollup[];
  subTotal: {
    opening: number;
    income: number;
    expense: number;
    closing: number;
  };
  grand: {
    income: number;
    expense: number;
    net: number;
  };
}
