import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import { formatUSD, householdDuesStatus } from '@/lib/contributions/search';
import type { HouseholdRow } from '@/lib/members/types';

/** Category names that count as "annual dues" for the tracking widget. */
const DUES_CATEGORY_NAMES = ['cmo dues', 'cwo dues', 'legacy annual household dues'];

/**
 * Annual dues tracking widget (story 4.7; PRD §4.3). Shows, for the selected
 * year, which households have paid any dues and which have not — so the
 * Financial Secretary can follow up. Status uses icon + label + color (never
 * color alone) per the brand rules.
 */
export function AnnualDuesWidget({
  households,
  contributions,
  categories,
  year,
}: {
  households: HouseholdRow[];
  contributions: ContributionRow[];
  categories: CategoryRow[];
  year: number;
}) {
  const duesCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of categories) {
      if (DUES_CATEGORY_NAMES.includes(c.name.toLowerCase())) ids.add(c.id);
    }
    return ids;
  }, [categories]);

  const statuses = useMemo(
    () => householdDuesStatus(households, contributions, duesCategoryIds, year),
    [households, contributions, duesCategoryIds, year],
  );

  const paidCount = statuses.filter((s) => s.paid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual dues — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm text-ink-700">
          {paidCount} of {households.length} households have paid dues this year.
        </p>
        {households.length === 0 ? (
          <p className="mt-2 text-caption text-ink-500">No households on file yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5" aria-label={`Dues status for ${year}`}>
            {statuses.map((s) => (
              <li
                key={s.household.id}
                className="flex items-center justify-between border-b border-line-200 pb-1.5 text-body-sm last:border-b-0"
              >
                <span className="text-ink-900">{s.household.name}</span>
                {s.paid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-caption font-medium text-success">
                    <span aria-hidden="true">✓</span> Paid {formatUSD(s.total)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-caption font-medium text-warning">
                    <span aria-hidden="true">•</span> Not paid
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
