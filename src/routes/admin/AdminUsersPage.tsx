import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { APP_ROLES, ROLE_LABELS, type AppRole } from '@/lib/auth/roles';
import { listUsers, setUserActive, updateUserRole } from '@/lib/admin/api';
import type { AdminUserRow } from '@/lib/admin/types';

const FIELD =
  'h-9 rounded-md border border-input bg-background px-2 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Privilege ranking used only to decide when a role change is an *elevation*
 * (and therefore needs an explicit confirmation step, backlog story 9.1). This
 * is a UX safeguard; RLS is the real boundary.
 */
const ROLE_RANK: Record<AppRole, number> = {
  member: 0,
  group_fin_sec: 1,
  finance_council: 1,
  treasurer: 2,
  fin_secretary: 2,
  chaplain: 3,
  admin: 4,
};

interface PendingChange {
  user: AdminUserRow;
  nextRole: AppRole;
}

/**
 * Admin users list + role assignment (Sprint 9 story 9.1; PRD §4.11, §7
 * "Manage user roles"). Elevating a user's privileges opens a confirmation
 * dialog; lateral/downgrade changes apply directly. Users are soft-activated,
 * never hard-deleted. All writes are admin-gated by RLS.
 */
export function AdminUsersPage() {
  const { client } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setError('The Admin Console is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsers(client));
    } catch {
      setError('We could not load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyRole = useCallback(
    async (user: AdminUserRow, nextRole: AppRole) => {
      if (!client) return;
      setBusyId(user.id);
      setError(null);
      try {
        await updateUserRole(client, user.id, nextRole);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      } catch {
        setError('We could not change that role. Please try again.');
      } finally {
        setBusyId(null);
      }
    },
    [client],
  );

  const onRoleSelect = (user: AdminUserRow, nextRole: AppRole) => {
    if (nextRole === user.role) return;
    const isElevation = ROLE_RANK[nextRole] > ROLE_RANK[user.role];
    if (isElevation) {
      setPending({ user, nextRole });
    } else {
      void applyRole(user, nextRole);
    }
  };

  const onToggleActive = async (user: AdminUserRow) => {
    if (!client) return;
    setBusyId(user.id);
    setError(null);
    try {
      await setUserActive(client, user.id, !user.is_active);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)),
      );
    } catch {
      setError('We could not update that account. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { user, nextRole } = pending;
    setPending(null);
    await applyRole(user, nextRole);
  };

  const rows = useMemo(() => users, [users]);

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Users &amp; roles</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        Assign roles to accounts. Elevating a user&rsquo;s privileges asks for confirmation. Row
        Level Security enforces every change server-side.
      </p>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-body-sm text-muted-foreground">Loading users…</p>
        ) : rows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    <label className="sr-only" htmlFor={`role-${u.id}`}>
                      Role for {u.email}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      className={FIELD}
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => onRoleSelect(u, e.target.value as AppRole)}
                    >
                      {APP_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>{u.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => void onToggleActive(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => (open ? null : setPending(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role elevation</DialogTitle>
            <DialogDescription>
              {pending
                ? `Grant ${pending.user.email} the ${ROLE_LABELS[pending.nextRole]} role? This increases their access.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmPending()}>Confirm elevation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
