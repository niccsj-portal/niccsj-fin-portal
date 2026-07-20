import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { getMember, listHouseholds } from '@/lib/members/api';
import { listCategories, listContributions } from '@/lib/contributions/api';
import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import {
  buildLookups,
  contributionYear,
  sumByCategory,
  totalAmount,
} from '@/lib/contributions/search';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';

/**
 * Member self-service home (backlog story 3.1; UX §5.1; graphics §10.1).
 * A calm, non-technical landing surface: a friendly welcome, a "This Year at
 * a Glance" KPI hero with the household's real current-year giving total and a
 * per-category breakdown, a recent-contributions list, and the annual-summary
 * call-to-action. All data is scoped to the member's own household by RLS
 * (`members_select_own_household` / `caller_household_id()`).
 */

/** Standard giving categories shown when there is no giving yet this year. */
const YTD_CATEGORIES = [
  'cmoDues',
  'cwoDues',
  'harvest',
  'buildingFund',
  'donations',
  'offertory',
] as const;

function formatUSD(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MemberDashboard() {
  const { t } = useTranslation();
  const { client, memberId } = useAuth();
  const [member, setMember] = useState<MemberRow | null>(null);
  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client || !memberId) return;
      const [me, households, contributions, cats] = await Promise.all([
        getMember(client, memberId),
        listHouseholds(client),
        listContributions(client, { activeOnly: true }),
        listCategories(client),
      ]);
      if (!active) return;
      setMember(me);
      setHousehold(households.find((h) => h.id === me.household_id) ?? households[0] ?? null);
      setRows(contributions);
      setCategories(cats);
    }
    void load();
    return () => {
      active = false;
    };
  }, [client, memberId]);

  const fullName = member ? `${member.first_name} ${member.last_name}`.trim() : '';

  const currentYear = new Date().getFullYear();
  const lookups = useMemo(() => buildLookups(categories, [], []), [categories]);
  const forYear = useMemo(
    () => rows.filter((r) => contributionYear(r) === currentYear),
    [rows, currentYear],
  );
  const total = useMemo(() => totalAmount(forYear), [forYear]);
  const byCategory = useMemo(() => sumByCategory(forYear, lookups), [forYear, lookups]);
  const recent = useMemo(() => rows.slice(0, 5), [rows]);

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-display font-semibold text-brand-900">
        {fullName ? t('dashboard.welcomeNamed', { name: fullName }) : t('dashboard.welcome')}
      </h1>
      <p className="mt-2 text-body text-ink-700">
        {household ? (
          <>
            {t('dashboard.householdLabel')} <strong>{household.name}</strong>
          </>
        ) : (
          t('dashboard.familyPortal')
        )}
      </p>

      {/* Hero KPI card */}
      <Card className="mt-8 max-w-xl border-l-4 border-l-accent-600">
        <CardHeader>
          <CardTitle>{t('dashboard.glance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-caption uppercase tracking-wide text-ink-500">
            {t('dashboard.totalLabel')}
          </p>
          <p
            data-testid="ytd-total"
            className="font-serif text-display tabular-nums text-accent-600"
          >
            {formatUSD(total)}
          </p>

          <ul className="mt-6 space-y-2" aria-label={t('dashboard.categoriesAria')}>
            {byCategory.length > 0
              ? byCategory.map((row) => (
                  <li
                    key={row.categoryId}
                    className="flex items-center justify-between border-b border-line-200 pb-1 text-body-sm last:border-b-0"
                  >
                    <span className="text-ink-700">{row.name}</span>
                    <span className="tabular-nums text-ink-900">{formatUSD(row.total)}</span>
                  </li>
                ))
              : YTD_CATEGORIES.map((category) => (
                  <li
                    key={category}
                    className="flex items-center justify-between border-b border-line-200 pb-1 text-body-sm last:border-b-0"
                  >
                    <span className="text-ink-700">{t(`categories.${category}`)}</span>
                    <span className="tabular-nums text-ink-500">{formatUSD(0)}</span>
                  </li>
                ))}
          </ul>

          {byCategory.length === 0 ? (
            <p className="mt-4 text-caption text-ink-500">{t('dashboard.trackingSoon')}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Recent contributions */}
      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>{t('dashboard.recent')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <ul className="space-y-2" aria-label={t('dashboard.recent')}>
              {recent.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between border-b border-line-200 pb-1 text-body-sm last:border-b-0"
                >
                  <span className="text-ink-700">
                    {new Date(row.contribution_date).toLocaleDateString('en-US')} ·{' '}
                    {lookups.categoryName(row.category_id)}
                  </span>
                  <span className="tabular-nums text-ink-900">{formatUSD(Number(row.amount))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-ink-500">{t('dashboard.noContributions')}</p>
          )}
        </CardContent>
      </Card>

      {/* Annual summary call-to-action (enabled in Sprint 8) */}
      <div className="mt-6">
        <Button disabled title={t('dashboard.downloadTitle')}>
          {t('dashboard.downloadCta')}
        </Button>
        <p className="mt-1 text-caption text-ink-500">{t('dashboard.downloadNote')}</p>
      </div>
    </div>
  );
}
