import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { statusTone } from '@/lib/expenses/search';
import type { ExpenseStatus } from '@/lib/expenses/types';

const ICONS = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
} as const;

/**
 * Expense status pill. Status is always communicated by icon + label + color,
 * never color alone (PRD §6 graphics standard, NFR §5 accessibility).
 */
export function ExpenseStatusChip({ status }: { status: ExpenseStatus }) {
  const tone = statusTone(status);
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium',
        tone.className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {tone.label}
    </span>
  );
}
