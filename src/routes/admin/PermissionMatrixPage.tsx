import { Check, Minus, X } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MATRIX_ROLE_ORDER,
  PERMISSION_MATRIX,
  ROLE_COLUMN_LABELS,
  type PermissionValue,
} from '@/lib/admin/permissionMatrix';

/**
 * Role-permission matrix view (Sprint 9 story 9.2; PRD §4.11, §7). A read-only
 * mirror of PRD §7 so an Admin can confirm each role's effective access. RLS is
 * the authoritative boundary — this screen documents, it never grants.
 */

function Cell({ value }: { value: PermissionValue }) {
  if (value === 'yes') {
    return (
      <span className="inline-flex items-center justify-center text-emerald-700">
        <Check aria-hidden="true" className="size-4" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === 'conditional') {
    return (
      <span className="inline-flex items-center justify-center text-amber-600">
        <Minus aria-hidden="true" className="size-4" />
        <span className="sr-only">Conditional</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-ink-300">
      <X aria-hidden="true" className="size-4" />
      <span className="sr-only">No</span>
    </span>
  );
}

export function PermissionMatrixPage() {
  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Role-permission matrix</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        Each role&rsquo;s effective access, mirroring the permissions matrix in the PRD. Row Level
        Security is the authoritative boundary; this view is for review only.
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-body-sm text-ink-700" aria-hidden="true">
        <span className="inline-flex items-center gap-1">
          <Check className="size-4 text-emerald-700" /> Allowed
        </span>
        <span className="inline-flex items-center gap-1">
          <Minus className="size-4 text-amber-600" /> Conditional
        </span>
        <span className="inline-flex items-center gap-1">
          <X className="size-4 text-ink-300" /> Not allowed
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-64">Action</TableHead>
              {MATRIX_ROLE_ORDER.map((role) => (
                <TableHead key={role} className="text-center">
                  {ROLE_COLUMN_LABELS[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_MATRIX.map((row) => (
              <TableRow key={row.action}>
                <TableCell className="font-medium text-ink-900">
                  {row.action}
                  {row.note ? (
                    <span className="block text-caption font-normal text-muted-foreground">
                      {row.note}
                    </span>
                  ) : null}
                </TableCell>
                {MATRIX_ROLE_ORDER.map((role) => (
                  <TableCell key={role} className="text-center">
                    <Cell value={row.values[role]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
