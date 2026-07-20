import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/AuthContext';
import { deactivateMember, reactivateMember } from '@/lib/members/api';
import type { MemberRow } from '@/lib/members/types';

/**
 * Confirmation dialog for soft-deleting (deactivating) or restoring a member
 * (backlog story 2.5; PRD §4.2 — records are never hard-deleted). The same
 * dialog handles reactivation when the target is already inactive.
 */
export function DeactivateMemberDialog({
  member,
  open,
  onOpenChange,
  onConfirmed,
}: {
  member: MemberRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const { client } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const deactivating = member.is_active;
  const fullName = `${member.first_name} ${member.last_name}`;

  const onConfirm = async () => {
    if (!client) {
      setError('This action is unavailable: the app is not configured.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (deactivating) await deactivateMember(client, member.id);
      else await reactivateMember(client, member.id);
      onOpenChange(false);
      onConfirmed();
    } catch {
      setError('We could not complete that action. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deactivating ? 'Deactivate member' : 'Restore member'}</DialogTitle>
          <DialogDescription>
            {deactivating
              ? `${fullName} (member #${member.member_number}) will be marked inactive. Their records are kept; you can restore them later.`
              : `${fullName} (member #${member.member_number}) will be marked active again.`}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-body-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={deactivating ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : deactivating ? 'Deactivate' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
