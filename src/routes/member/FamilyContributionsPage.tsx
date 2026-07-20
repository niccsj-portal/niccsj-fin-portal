import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
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
import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import {
  buildLookups,
  contributionYear,
  formatUSD,
  recentYears,
  sumByCategory,
  totalAmount,
} from '@/lib/contributions/search';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

type ViewMode = 'chart' | 'table';

/**
 * Member self-service family contributions (story 4.6; UX §5.1). Read-only and
 * scoped to the member's own household by RLS — a member never sees another
 * family's giving. Shows the year's total, a per-category breakdown as an
 * accessible bar chart, and a "View as table" toggle for a tabular fallback
 * (PRD §4.6 / NFR §5). Falls back to a calm empty state when nothing is
 * recorded for the selected year.
 */
export function FamilyContributionsPage() {
  const { t } = useTranslation();
  const { client } = useAuth();
  const years = recentYears();

  const [year, setYear] = useState<number>(years[0]);
  const [mode, setMode] = useState<ViewMode>('chart');
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!client) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const [cats, contributions] = await Promise.all([
          listCategories(client),
          listContributions(client, { activeOnly: true }),
        ]);
        if (!active) return;
        setCategories(cats);
        setRows(contributions);
      } catch {
        if (active) setError(t('contributions.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [client, t]);

  const lookups = useMemo(() => buildLookups(categories, [], []), [categories]);
  const forYear = useMemo(
    () => rows.filter((r) => contributionYear(r) === year),
    [rows, year],
  );
  const byCategory = useMemo(() => sumByCategory(forYear, lookups), [forYear, lookups]);
  const total = useMemo(() => totalAmount(forYear), [forYear]);
  const hasData = forYear.length > 0;

  return (
    <div className="max-w-2xl">
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">
        {t('contributions.title')}
      </h1>
      <p className="mt-2 text-body text-ink-700">{t('contributions.subtitle')}</p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="contrib-year" className="text-body-sm font-medium text-ink-900">
            {t('contributions.year')}
          </label>
          <select
            id="contrib-year"
            className={FIELD}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {hasData ? (
          <div
            className="ml-auto inline-flex rounded-md border border-line-200 p-0.5"
            role="group"
            aria-label={`${t('contributions.viewAsChart')} / ${t('contributions.viewAsTable')}`}
          >
            <button
              type="button"
              onClick={() => setMode('chart')}
              aria-pressed={mode === 'chart'}
              className={`rounded px-3 py-1 text-body-sm ${
                mode === 'chart' ? 'bg-brand-900 text-white' : 'text-ink-700'
              }`}
            >
              {t('contributions.viewAsChart')}
            </button>
            <button
              type="button"
              onClick={() => setMode('table')}
              aria-pressed={mode === 'table'}
              className={`rounded px-3 py-1 text-body-sm ${
                mode === 'table' ? 'bg-brand-900 text-white' : 'text-ink-700'
              }`}
            >
              {t('contributions.viewAsTable')}
            </button>
          </div>
        ) : null}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('contributions.yearHeading', { year })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-body-sm text-ink-500">{t('profile.loading')}</p>
          ) : error ? (
            <p role="alert" className="text-body-sm text-destructive">
              {error}
            </p>
          ) : !hasData ? (
            <>
              <p className="text-body-sm text-ink-700">{t('contributions.none')}</p>
              <p className="mt-2 text-caption text-ink-500">{t('contributions.noneNote')}</p>
            </>
          ) : (
            <>
              <p className="text-caption uppercase tracking-wide text-ink-500">
                {t('contributions.totalHeading', { year })}
              </p>
              <p className="font-serif text-display tabular-nums text-accent-600">
                {formatUSD(total)}
              </p>

              <h2 className="mt-6 text-body font-semibold text-ink-900">
                {t('contributions.byCategory')}
              </h2>

              {mode === 'chart' ? (
                <div className="mt-3">
                  <CategoryBarChart
                    data={byCategory}
                    ariaLabel={t('contributions.chartAria', { year })}
                  />
                </div>
              ) : (
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('contributions.category')}</TableHead>
                      <TableHead className="text-right">{t('contributions.amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCategory.map((c) => (
                      <TableRow key={c.categoryId}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUSD(c.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">{t('contributions.total')}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatUSD(total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
