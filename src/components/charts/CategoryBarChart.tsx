import { formatUSD, type CategoryTotal } from '@/lib/contributions/search';

/**
 * Accessible category bar chart (PRD §4.6 / NFR §5). Pure CSS bars — no chart
 * dependency — so it renders deterministically in tests and stays light. The
 * bars are decorative (`aria-hidden`); each row also shows the category name +
 * formatted amount as text, and the page pairs this with a "View as table"
 * toggle for a fully tabular fallback.
 */
export function CategoryBarChart({
  data,
  ariaLabel,
}: {
  data: CategoryTotal[];
  ariaLabel: string;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.total), 0) || 1;

  return (
    <ul className="space-y-3" aria-label={ariaLabel}>
      {data.map((d) => {
        const pct = Math.round((d.total / max) * 100);
        return (
          <li key={d.categoryId}>
            <div className="flex items-baseline justify-between text-body-sm">
              <span className="text-ink-700">{d.name}</span>
              <span className="tabular-nums font-medium text-ink-900">
                {formatUSD(d.total)}
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-line-200"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-accent-600"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
