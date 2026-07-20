import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  assignSubAccountUser,
  createSubAccount,
  listSubAccountUsers,
  listSubAccounts,
  listUsers,
  removeSubAccountUser,
} from '@/lib/admin/api';
import type { AdminUserRow, SubAccountRow, SubAccountUserRow } from '@/lib/admin/types';

const FIELD =
  'h-9 rounded-md border border-input bg-background px-2 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Sub-account & Group Financial Secretary assignment (Sprint 9 story 9.6; PRD
 * §4.5, §4.11). Admin assigns users to the CMO/CWO sub-accounts; the
 * `sub_account_users` join is the RLS scoping boundary that isolates each
 * group's ledger (PRD §7). All writes are admin-gated by RLS.
 */
export function SubAccountAssignmentPage() {
  const { client } = useAuth();
  const [subAccounts, setSubAccounts] = useState<SubAccountRow[]>([]);
  const [assignments, setAssignments] = useState<SubAccountUserRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!client) {
      setError('This section is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [accounts, subUsers, allUsers] = await Promise.all([
        listSubAccounts(client),
        listSubAccountUsers(client),
        listUsers(client),
      ]);
      setSubAccounts(accounts);
      setAssignments(subUsers);
      setUsers(allUsers);
    } catch {
      setError('We could not load sub-account assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const emailFor = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.email]));
    return (id: string) => map.get(id) ?? id;
  }, [users]);

  /** Group Financial Secretary accounts are the eligible assignees. */
  const eligibleUsers = useMemo(
    () => users.filter((u) => u.role === 'group_fin_sec' && u.is_active),
    [users],
  );

  const onAssign = async (subAccountId: string) => {
    const userId = selected[subAccountId];
    if (!client || !userId) return;
    setBusy(true);
    setError(null);
    try {
      await assignSubAccountUser(client, subAccountId, userId);
      setSelected((prev) => ({ ...prev, [subAccountId]: '' }));
      await load();
    } catch {
      setError('We could not add that assignment. Please try again.');
      setBusy(false);
    }
  };

  const onRemove = async (assignmentId: string) => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      await removeSubAccountUser(client, assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch {
      setError('We could not remove that assignment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onCreateSubAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!client) return;
    const name = newName.trim();
    const slug = newSlug.trim();
    if (!name || !slug) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createSubAccount(client, { name, slug });
      setSubAccounts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewSlug('');
    } catch {
      setError('We could not create that sub-account. The code may already be in use.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">
        Sub-accounts &amp; Group FS
      </h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        Assign Group Financial Secretary accounts to a sub-account. This assignment is what scopes
        each group&rsquo;s ledger — Row Level Security enforces it.
      </p>

      <form
        onSubmit={onCreateSubAccount}
        aria-label="Create sub-account"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-sa-name" className="text-caption font-medium text-ink-700">
            New sub-account name
          </label>
          <Input
            id="new-sa-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Youth Group"
            className="w-64"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-sa-slug" className="text-caption font-medium text-ink-700">
            Code
          </label>
          <Input
            id="new-sa-slug"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="e.g. youth"
            className="w-40"
          />
        </div>
        <Button type="submit" disabled={creating || !newName.trim() || !newSlug.trim()}>
          {creating ? 'Adding…' : 'Add sub-account'}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-body-sm text-muted-foreground">Loading assignments…</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {subAccounts.map((account) => {
            const rows = assignments.filter((a) => a.sub_account_id === account.id);
            const assignedIds = new Set(rows.map((a) => a.user_id));
            const options = eligibleUsers.filter((u) => !assignedIds.has(u.id));
            return (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle>{account.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rows.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">
                      No one is assigned to this sub-account yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {rows.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span className="text-body-sm text-ink-900">{emailFor(a.user_id)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void onRemove(a.id)}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <label
                        htmlFor={`assign-${account.id}`}
                        className="text-caption font-medium text-ink-700"
                      >
                        Assign a Group Financial Secretary
                      </label>
                      <select
                        id={`assign-${account.id}`}
                        className={FIELD}
                        value={selected[account.id] ?? ''}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [account.id]: e.target.value }))
                        }
                      >
                        <option value="">Select a user…</option>
                        {options.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      disabled={busy || !selected[account.id]}
                      onClick={() => void onAssign(account.id)}
                    >
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
