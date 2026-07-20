import { reportYears } from '@/lib/reports/aggregate';
import { PERIOD_KINDS, type PeriodKind, type ReportPeriod } from '@/lib/reports/types';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const MONTH_OPTIONS = [
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
];

const KIND_LABELS: Record<PeriodKind, string> = {
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Annual',
};

/**
 * Report period selector (story 7.4). Chooses the granularity (month / quarter /
 * year) plus the year and, when relevant, the month or quarter. Controlled — the
 * hosting dashboard owns the `ReportPeriod` and re-aggregates on change.
 */
export function PeriodSelector({
  period,
  onChange,
}: {
  period: ReportPeriod;
  onChange: (next: ReportPeriod) => void;
}) {
  const years = reportYears();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor="report-kind" className="text-body-sm font-medium text-ink-900">
          Report type
        </label>
        <select
          id="report-kind"
          className={FIELD}
          value={period.kind}
          onChange={(e) => {
            const kind = e.target.value as PeriodKind;
            onChange({
              kind,
              year: period.year,
              month: kind === 'month' ? (period.month ?? 1) : undefined,
              quarter: kind === 'quarter' ? (period.quarter ?? 1) : undefined,
            });
          }}
        >
          {PERIOD_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="report-year" className="text-body-sm font-medium text-ink-900">
          Year
        </label>
        <select
          id="report-year"
          className={FIELD}
          value={period.year}
          onChange={(e) => onChange({ ...period, year: Number(e.target.value) })}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {period.kind === 'month' ? (
        <div className="space-y-1.5">
          <label htmlFor="report-month" className="text-body-sm font-medium text-ink-900">
            Month
          </label>
          <select
            id="report-month"
            className={FIELD}
            value={period.month ?? 1}
            onChange={(e) => onChange({ ...period, month: Number(e.target.value) })}
          >
            {MONTH_OPTIONS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {period.kind === 'quarter' ? (
        <div className="space-y-1.5">
          <label htmlFor="report-quarter" className="text-body-sm font-medium text-ink-900">
            Quarter
          </label>
          <select
            id="report-quarter"
            className={FIELD}
            value={period.quarter ?? 1}
            onChange={(e) => onChange({ ...period, quarter: Number(e.target.value) })}
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>
                Q{q}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
