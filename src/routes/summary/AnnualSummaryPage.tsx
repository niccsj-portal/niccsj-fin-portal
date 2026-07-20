import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileBadge, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { canViewAllContributions } from '@/lib/auth/roles';
import { listHouseholds } from '@/lib/members/api';
import type { HouseholdRow } from '@/lib/members/types';
import { reportYears } from '@/lib/reports/aggregate';
import {
  SignatureRequiredError,
  downloadBlob,
  generateAnnualSummary,
} from '@/lib/annualSummary/api';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * End-of-Year Family Contribution Summary generator (stories 8.4 + 8.5; PRD
 * §4.6, §7). Privileged roles (FS / Treasurer / Chaplain / Admin) may generate
 * any household's summary; a family member generates only their own. The PDF is
 * rendered server-side by the `generate-annual-summary` Edge Function, which
 * blocks issuance when no Financial Secretary signature is on file — surfaced
 * here as a clear, friendly message (story 8.5).
 */
export function AnnualSummaryPage() {
  const { client, role, memberId } = useAuth();
  const privileged = canViewAllContributions(role);
  const years = useMemo(() => reportYears(), []);

  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [householdId, setHouseholdId] = useState<string>('');
  const [ownHouseholdId, setOwnHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setError('Annual summaries are unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (privileged) {
        const rows = await listHouseholds(client);
        setHouseholds(rows);
        setHouseholdId((prev) => prev || rows[0]?.id || '');
      } else if (memberId) {
        const { data, error: memberErr } = await client
          .from('members')
          .select('household_id')
          .eq('id', memberId)
          .single();
        if (memberErr) throw new Error(memberErr.message);
        setOwnHouseholdId((data?.household_id as string | null) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load households.');
    } finally {
      setLoading(false);
    }
  }, [client, privileged, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const targetHouseholdId = privileged ? householdId : ownHouseholdId;
  const canGenerate = !!client && !!targetHouseholdId && !generating;

  const onGenerate = async () => {
    if (!client || !targetHouseholdId) return;
    setError(null);
    setBlocked(null);
    setGenerating(true);
    try {
      const { filename, blob } = await generateAnnualSummary(client, {
        householdId: targetHouseholdId,
        year,
      });
      downloadBlob(filename, blob);
    } catch (err) {
      if (err instanceof SignatureRequiredError) {
        setBlocked(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not generate the summary.');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-h4 font-semibold text-ink-900">
          <FileBadge className="size-5 text-brand-700" aria-hidden />
          Annual Family Contribution Summary
        </h1>
        <p className="text-body-sm text-ink-500">
          Generate the official signed End-of-Year summary PDF for a family and calendar year.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-body-sm text-danger">
          {error}
        </div>
      )}
      {blocked && (
        <div
          role="alert"
          className="rounded-md border border-warning/40 bg-warning/5 p-4 text-body-sm text-warning-foreground"
        >
          <p className="font-medium text-warning">{blocked}</p>
          <p className="mt-1 text-ink-500">
            The Financial Secretary must upload a signature on the Signature page before summaries
            can be issued.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Choose a family and year</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {privileged && (
              <div className="space-y-1.5">
                <label htmlFor="summary-household" className="text-body-sm font-medium text-ink-900">
                  Household
                </label>
                <select
                  id="summary-household"
                  className={FIELD}
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  disabled={loading || households.length === 0}
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="summary-year" className="text-body-sm font-medium text-ink-900">
                Year
              </label>
              <select
                id="summary-year"
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

            <Button onClick={() => void onGenerate()} disabled={!canGenerate}>
              {generating ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 size-4" aria-hidden />
              )}
              {generating ? 'Generating…' : 'Generate PDF'}
            </Button>
          </div>

          {!privileged && !loading && !ownHouseholdId && (
            <p className="text-body-sm text-ink-500">
              No family is linked to your account yet. Please contact the Financial Secretary.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
