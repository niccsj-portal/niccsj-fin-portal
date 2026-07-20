import { Card, CardContent } from '@/components/ui/card';

/**
 * A single headline KPI tile for the report dashboards (stories 7.1 / 7.2). The
 * value uses tabular figures so columns of money align (graphics.md §4). `tone`
 * lets the net-balance tile read positive/negative without relying on color
 * alone — the label always states what the number means.
 */
export function KpiCard({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
  hint?: string;
}) {
  const valueTone =
    tone === 'positive'
      ? 'text-success'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-brand-900';

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-caption uppercase tracking-wide text-ink-500">{label}</p>
        <p className={`mt-1 font-serif text-h2 tabular-nums ${valueTone}`}>{value}</p>
        {hint ? <p className="mt-1 text-caption text-ink-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
