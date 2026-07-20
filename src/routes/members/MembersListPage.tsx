import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';

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
import { canEditMembers } from '@/lib/auth/roles';
import { listHouseholds, listMembers } from '@/lib/members/api';
import { memberMatchesSearch } from '@/lib/members/search';
import type { HouseholdRow, MemberRow, MemberStatusFilter } from '@/lib/members/types';
import { DeactivateMemberDialog } from '@/routes/members/DeactivateMemberDialog';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Members directory (backlog 2.2). Server-side status + household filters,
 * client-side free-text search. Create/edit/deactivate actions appear only for
 * member-editor roles (RLS is the real boundary — PRD §7).
 */
export function MembersListPage() {
  const { client, role } = useAuth();
  const canEdit = canEditMembers(role);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [status, setStatus] = useState<MemberStatusFilter>('active');
  const [householdId, setHouseholdId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<MemberRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const householdName = useMemo(() => {
    const map = new Map(households.map((h) => [h.id, h.name]));
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '—');
  }, [households]);

  const loadMembers = useCallback(async () => {
    if (!client) {
      setError('The member directory is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMembers(client, {
        status,
        householdId: householdId || null,
      });
      setMembers(rows);
    } catch {
      setError('We could not load members. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client, status, householdId]);

  useEffect(() => {
    if (!client) return;
    void listHouseholds(client)
      .then(setHouseholds)
      .catch(() => setHouseholds([]));
  }, [client]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const visible = members.filter((m) => memberMatchesSearch(m, search));

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-brand-900">Members</h1>
        {canEdit ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/members/import">
                <Upload aria-hidden="true" /> Import CSV
              </Link>
            </Button>
            <Button asChild>
              <Link to="/members/new">
                <Plus aria-hidden="true" /> New member
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="member-search" className="text-caption font-medium text-ink-700">
            Search
          </label>
          <Input
            id="member-search"
            placeholder="Name, number, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="member-status" className="text-caption font-medium text-ink-700">
            Status
          </label>
          <select
            id="member-status"
            className={FIELD}
            value={status}
            onChange={(e) => setStatus(e.target.value as MemberStatusFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="member-household" className="text-caption font-medium text-ink-700">
            Household
          </label>
          <select
            id="member-household"
            className={FIELD}
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
          >
            <option value="">All households</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
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
          <p className="text-body-sm text-muted-foreground">Loading members…</p>
        ) : visible.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No members match your filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Household</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.member_number}</TableCell>
                  <TableCell className="font-medium">
                    {m.first_name} {m.last_name}
                  </TableCell>
                  <TableCell>{householdName(m.household_id)}</TableCell>
                  <TableCell>{m.email ?? '—'}</TableCell>
                  <TableCell>{m.is_active ? 'Active' : 'Inactive'}</TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/members/${m.id}`}>Edit</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTarget(m);
                            setDialogOpen(true);
                          }}
                        >
                          {m.is_active ? 'Deactivate' : 'Restore'}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DeactivateMemberDialog
        member={target}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirmed={loadMembers}
      />
    </div>
  );
}
