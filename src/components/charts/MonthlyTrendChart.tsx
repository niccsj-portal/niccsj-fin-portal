import { formatUSD } from '@/lib/contributions/search';
import type { TrendPoint } from '@/lib/reports/types';

/**
 * Monthly income-vs-expense trend as pure CSS bars (story 7.1; NFR §5). No chart
 * dependency, so it renders deterministically in tests and stays light. Bars are
 * decorative (`aria-hidden`); the paired "View as table" fallback carries the
 * real figures. Income and expense sit side by side per month, scaled to the
 * largest value across the series.
 */
export function MonthlyTrendChart({
  data,
  ariaLabel,
}: {
  data: TrendPoint[];
  ariaLabel: string;
}) {
  const max =
    data.reduce((m, d) => Math.max(m, d.income, d.expense), 0) || 1;

  return (
    <div aria-label={ariaLabel}>
      <ul className="flex items-end gap-1.5" aria-hidden="true" style={{ height: '9rem' }}>
        {data.map((d) => (
          <li key={d.month} className="flex flex-1 flex-col items-center justify-end gap-0.5">
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              <div
                className="w-1/2 rounded-t bg-success/80"
                style={{ height: `${Math.round((d.income / max) * 100)}%` }}
                title={`${d.label} income ${formatUSD(d.income)}`}
              />
              <div
                className="w-1/2 rounded-t bg-warning/80"
                style={{ height: `${Math.round((d.expense / max) * 100)}%` }}
                title={`${d.label} expense ${formatUSD(d.expense)}`}
              />
            </div>
            <span className="text-caption text-ink-500">{d.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-4 text-caption text-ink-700">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-success/80" aria-hidden="true" /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-warning/80" aria-hidden="true" /> Expense
        </span>
      </div>
    </div>
  );
}
