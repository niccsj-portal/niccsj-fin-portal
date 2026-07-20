import { CheckCircle2, Send } from 'lucide-react';

import { cn } from '@/lib/utils';
import { reportStatusTone } from '@/lib/subAccounts/search';
import type { SubAccountReportStatus } from '@/lib/subAccounts/types';

const ICONS = {
  submitted: Send,
  acknowledged: CheckCircle2,
} as const;

/**
 * Monthly summary status pill (story 6.5). Status is always communicated by
 * icon + label + color, never color alone (PRD §6 graphics standard, NFR §5).
 */
export function ReportStatusChip({ status }: { status: SubAccountReportStatus }) {
  const tone = reportStatusTone(status);
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
