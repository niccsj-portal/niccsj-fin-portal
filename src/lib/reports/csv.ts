import type { CategoryTotal } from '@/lib/contributions/search';
import type {
  FinanceKpis,
  Participation,
  SubAccountRollup,
} from '@/lib/reports/types';

/**
 * CSV export for the report views (story 7.4). A plain string builder (no
 * dependency) that opens cleanly in Excel / Google Sheets — v1 ships PDF + CSV
 * only (PRD §4.6, technology.md §13). Amounts are written as plain numbers so a
 * spreadsheet can total them; the aggregate-only rule holds — no per-member row
 * is ever emitted, only KPIs, category totals, and group rollups.
 */

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function row(cells: Array<string | number>): string {
  return cells.map((c) => escapeCsv(String(c))).join(',');
}

export interface FinanceReportCsvInput {
  periodLabel: string;
  kpis: FinanceKpis;
  categories: CategoryTotal[];
  participation?: Participation;
  rollups?: SubAccountRollup[];
  /** Title shown on the first line (e.g. "Treasurer Finance Report"). */
  title: string;
}

/** Build the report CSV. Sections are separated by a blank line. */
export function financeReportToCsv(input: FinanceReportCsvInput): string {
  const { title, periodLabel, kpis, categories, participation, rollups } = input;
  const lines: string[] = [];

  lines.push(row([title]));
  lines.push(row(['Period', periodLabel]));
  lines.push('');

  lines.push(row(['Metric', 'Value']));
  lines.push(row(['Income', kpis.income]));
  lines.push(row(['Expense (approved)', kpis.expense]));
  lines.push(row(['Net balance', kpis.net]));
  lines.push(row(['Pending approvals', kpis.pending]));
  if (participation) {
    lines.push(row(['Participating households', participation.contributing]));
    lines.push(row(['Total households', participation.total]));
    lines.push(row(['Participation rate', `${Math.round(participation.rate * 100)}%`]));
  }

  if (categories.length > 0) {
    lines.push('');
    lines.push(row(['Category', 'Income']));
    for (const c of categories) lines.push(row([c.name, c.total]));
  }

  if (rollups && rollups.length > 0) {
    lines.push('');
    lines.push(row(['Sub-account', 'Opening', 'Income', 'Expense', 'Closing']));
    for (const r of rollups) {
      lines.push(row([r.name, r.opening, r.income, r.expense, r.closing]));
    }
  }

  return lines.join('\n');
}
