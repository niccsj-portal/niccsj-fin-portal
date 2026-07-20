import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { getBuildInfo } from '@/lib/admin/buildInfo';
import { pingSupabase, recentClientErrorCount } from '@/lib/admin/api';

/** ISO date 30 days ago — the window for the "recent client errors" count. */
function thirtyDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type Connectivity = 'checking' | 'online' | 'offline';

/**
 * System health page (Sprint 9 story 9.4; PRD §4.11). Admin-only. Surfaces the
 * deployed version, last backup, recent client-error volume, and a live
 * Supabase connectivity indicator so a volunteer admin can sanity-check the
 * system at a glance.
 */
export function HealthPage() {
  const { client } = useAuth();
  const build = getBuildInfo();
  const [errorCount, setErrorCount] = useState<number | null>(null);
  const [connectivity, setConnectivity] = useState<Connectivity>('checking');

  useEffect(() => {
    if (!client) {
      setConnectivity('offline');
      return;
    }
    let active = true;
    void pingSupabase(client).then((ok) => {
      if (active) setConnectivity(ok ? 'online' : 'offline');
    });
    void recentClientErrorCount(client, thirtyDaysAgoIso())
      .then((count) => {
        if (active) setErrorCount(count);
      })
      .catch(() => {
        if (active) setErrorCount(null);
      });
    return () => {
      active = false;
    };
  }, [client]);

  const connectivityLabel =
    connectivity === 'checking'
      ? 'Checking…'
      : connectivity === 'online'
        ? 'Online'
        : 'Unreachable';
  const connectivityColor =
    connectivity === 'online'
      ? 'text-emerald-700'
      : connectivity === 'offline'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">System health</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        A quick operational snapshot for running the portal.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deployed version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-body-sm text-ink-700">
            <p>
              Commit: <span className="font-mono text-ink-900">{build.commitSha}</span>
            </p>
            <p>Built: {formatDate(build.buildTime)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supabase connectivity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-body font-medium ${connectivityColor}`} role="status">
              <span
                aria-hidden="true"
                className={`mr-2 inline-block size-2.5 rounded-full ${
                  connectivity === 'online'
                    ? 'bg-emerald-600'
                    : connectivity === 'offline'
                      ? 'bg-destructive'
                      : 'bg-muted-foreground'
                }`}
              />
              {connectivityLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent client errors</CardTitle>
          </CardHeader>
          <CardContent className="text-body-sm text-ink-700">
            <p className="text-h2 font-semibold text-ink-900">
              {errorCount === null ? '—' : errorCount}
            </p>
            <p className="text-caption text-muted-foreground">Captured in the last 30 days.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last backup</CardTitle>
          </CardHeader>
          <CardContent className="text-body-sm text-ink-700">
            <p>{formatDate(build.lastBackup)}</p>
            <p className="text-caption text-muted-foreground">
              Backups are performed from the backup runbook.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
