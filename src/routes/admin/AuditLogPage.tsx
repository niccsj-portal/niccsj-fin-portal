import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { listAuditLog, listUsers } from '@/lib/admin/api';
import type { AdminUserRow, AuditLogFilters, AuditLogRow } from '@/lib/admin/types';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Entities that carry an audit trigger (story 1.4 + later sprints). */
const ENTITIES = [
  'members',
  'households',
  'contributions',
  'expenses',
  'sub_account_transactions',
  'sub_account_reports',
  'users',
  'categories',
] as const;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * Audit log explorer (Sprint 9 story 9.3; PRD §4.11, §5). Admin (and, per RLS,
 * Chaplain) can browse the append-only audit trail with filters by user,
 * entity, action and date range. Read-only; RLS is the boundary.
 */
export function AuditLogPage() {
  const { client } = useAuth();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const emailFor = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.email]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : 'System');
  }, [users]);

  const load = useCallback(async () => {
    if (!client) {
      setError('The audit log is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const filters: AuditLogFilters = {
      userId: userId || null,
      entity: entity || null,
      action: (action || null) as AuditLogFilters['action'],
      from: from ? new Date(from).toISOString() : null,
      // Include the whole "to" day by advancing to its end.
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : null,
    };
    try {
      setRows(await listAuditLog(client, filters));
    } catch {
      setError('We could not load the audit log. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client, userId, entity, action, from, to]);

  useEffect(() => {
    if (!client) return;
    void listUsers(client)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Audit log</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        Every recorded change to member and financial data, newest first.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-user" className="text-caption font-medium text-ink-700">
            User
          </label>
          <select
            id="audit-user"
            className={FIELD}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-entity" className="text-caption font-medium text-ink-700">
            Entity
          </label>
          <select
            id="audit-entity"
            className={FIELD}
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            <option value="">All entities</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-action" className="text-caption font-medium text-ink-700">
            Action
          </label>
          <select
            id="audit-action"
            className={FIELD}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All actions</option>
            <option value="insert">Insert</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-from" className="text-caption font-medium text-ink-700">
            From
          </label>
          <input
            id="audit-from"
            type="date"
            className={FIELD}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-to" className="text-caption font-medium text-ink-700">
            To
          </label>
          <input
            id="audit-to"
            type="date"
            className={FIELD}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-body-sm text-muted-foreground">Loading audit log…</p>
        ) : rows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No audit entries match your filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatTimestamp(r.occurred_at)}</TableCell>
                  <TableCell>{emailFor(r.user_id)}</TableCell>
                  <TableCell className="capitalize">{r.action}</TableCell>
                  <TableCell>{r.entity}</TableCell>
                  <TableCell className="font-mono text-caption">{r.entity_id ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
