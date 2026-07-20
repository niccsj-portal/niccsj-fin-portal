import { useId, useState, type ReactNode } from 'react';

type ViewMode = 'chart' | 'table';

/**
 * Accessible chart wrapper (story 7.3; NFR §5, graphics.md §10.5). Pairs any
 * chart with a semantically-equivalent data table behind a "View as table"
 * toggle so the same information is reachable by keyboard and screen reader,
 * never by color/shape alone. The toggle is a labelled button group; each
 * button exposes `aria-pressed`, and the rendered region is `aria-label`led.
 */
export function ChartWithTableToggle({
  ariaLabel,
  chart,
  table,
  initialMode = 'chart',
  className,
}: {
  ariaLabel: string;
  chart: ReactNode;
  table: ReactNode;
  initialMode?: ViewMode;
  className?: string;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const regionId = useId();

  return (
    <div className={className}>
      <div
        className="no-print mb-3 inline-flex rounded-md border border-line-200 p-0.5"
        role="group"
        aria-label={`${ariaLabel}: view as chart or table`}
      >
        <button
          type="button"
          onClick={() => setMode('chart')}
          aria-pressed={mode === 'chart'}
          aria-controls={regionId}
          className={`rounded px-3 py-1 text-body-sm ${
            mode === 'chart' ? 'bg-brand-900 text-white' : 'text-ink-700'
          }`}
        >
          View as chart
        </button>
        <button
          type="button"
          onClick={() => setMode('table')}
          aria-pressed={mode === 'table'}
          aria-controls={regionId}
          className={`rounded px-3 py-1 text-body-sm ${
            mode === 'table' ? 'bg-brand-900 text-white' : 'text-ink-700'
          }`}
        >
          View as table
        </button>
      </div>

      <div id={regionId} aria-label={ariaLabel}>
        {mode === 'chart' ? chart : table}
      </div>
    </div>
  );
}
