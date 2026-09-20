import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { canRecordContributions } from '@/lib/auth/roles';
import { listCategories, listContributions } from '@/lib/contributions/api';
import type { CategoryRow, ContributionRow } from '@/lib/contributions/types';
import {
  buildLookups,
  filterContributions,
  formatUSD,
  recentYears,
  totalAmount,
  type ContributionFilter,
} from '@/lib/contributions/search';
import { listHouseholds, listMembers } from '@/lib/members/api';
import { householdLabel } from '@/lib/members/search';
import type { HouseholdRow, MemberRow } from '@/lib/members/types';
import { AnnualDuesWidget } from '@/routes/contributions/AnnualDuesWidget';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  card: 'Card',
  other: 'Other',
};

/**
 * Contributions ledger (admin) — stories 4.4 + 4.7 + 4.8. Recorders (FS /
 * Treasurer / Admin) see every entry; filters by year / category / household /
 * member and a free-text search refine the list client-side. An annual-dues
 * tracking widget summarises who has paid for the selected year. RLS is the
 * real boundary (PRD §7); this page assumes a recorder/privileged reader.
 */
export function ContributionsLedgerPage() {
  const { client, role } = useAuth();
  const canEdit = canRecordContributions(role);
  const years = recentYears();

  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number>(years[0]);
  const [categoryId, setCategoryId] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!client) {
      setError('Contributions are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [contributions, cats, hh, mem] = await Promise.all([
        listContributions(client, { activeOnly: true }),
        listCategories(client, { type: 'income' }),
        listHouseholds(client),
        listMembers(client),
      ]);
      setRows(contributions);
      setCategories(cats);
      setHouseholds(hh);
      setMembers(mem);
    } catch {
      setError('We could not load contributions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const lookups = useMemo(
    () => buildLookups(categories, households, members),
    [categories, households, members],
  );

  const filter: ContributionFilter = useMemo(
    () => ({
      year,
      categoryId: categoryId || undefined,
      householdId: householdId || undefined,
      memberId: memberId || undefined,
      search,
    }),
    [year, categoryId, householdId, memberId, search],
  );

  const visible = useMemo(
    () => filterContributions(rows, filter, lookups),
    [rows, filter, lookups],
  );
  const total = useMemo(() => totalAmount(visible), [visible]);

  const memberOptions = useMemo(
    () => (householdId ? members.filter((m) => m.household_id === householdId) : members),
    [members, householdId],
  );

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Contributions</h1>
        {canEdit ? (
          <Button asChild>
            <Link to="/contributions/new">
              <Plus aria-hidden="true" /> Record contribution
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ledger-search" className="text-caption font-medium text-ink-700">
                Search
              </label>
              <Input
                id="ledger-search"
                placeholder="Category, name, notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ledger-year" className="text-caption font-medium text-ink-700">
                Year
              </label>
              <select
                id="ledger-year"
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
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ledger-category" className="text-caption font-medium text-ink-700">
                Category
              </label>
              <select
                id="ledger-category"
                className={FIELD}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `Donations — ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ledger-household" className="text-caption font-medium text-ink-700">
                Household
              </label>
              <select
                id="ledger-household"
                className={FIELD}
                value={householdId}
                onChange={(e) => {
                  setHouseholdId(e.target.value);
                  setMemberId('');
                }}
              >
                <option value="">All households</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {householdLabel(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ledger-member" className="text-caption font-medium text-ink-700">
                Member
              </label>
              <select
                id="ledger-member"
                className={FIELD}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">All members</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-body-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-4">
            {loading ? (
              <p className="text-body-sm text-muted-foreground">Loading contributions…</p>
            ) : visible.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                No contributions match your filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Household</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="tabular-nums">{c.contribution_date}</TableCell>
                      <TableCell>{lookups.householdName(c.household_id)}</TableCell>
                      <TableCell>{lookups.memberName(c.member_id)}</TableCell>
                      <TableCell>
                        {lookups.categoryName(c.category_id)}
                        {c.correction_reason ? (
                          <span
                            className="ml-1 text-caption text-warning"
                            title={`Corrected: ${c.correction_reason}`}
                          >
                            (corrected)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{PAYMENT_LABELS[c.payment_method]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUSD(c.amount)}
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/contributions/${c.id}`}>Edit</Link>
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatUSD(total)}
                    </TableCell>
                    {canEdit ? <TableCell /> : null}
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <aside>
          <AnnualDuesWidget
            households={households}
            contributions={rows}
            categories={categories}
            year={year}
          />
        </aside>
      </div>
    </div>
  );
}
