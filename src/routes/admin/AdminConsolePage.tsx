import { Link } from 'react-router-dom';
import {
  Activity,
  FolderTree,
  ScrollText,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Admin Console landing (Sprint 9; PRD §4.11). A hub of the operational tools a
 * System Admin uses to run the volunteer system. Each tool lives on its own
 * route, all admin-gated by RequireRole and — authoritatively — by RLS.
 */
interface AdminTool {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TOOLS: readonly AdminTool[] = [
  {
    to: '/admin/users',
    title: 'Users & roles',
    description: 'Review accounts and assign roles, with a confirmation step for elevation.',
    icon: Users,
  },
  {
    to: '/admin/permissions',
    title: 'Role-permission matrix',
    description: 'Confirm each role\u2019s effective access (mirrors PRD \u00a77).',
    icon: ShieldCheck,
  },
  {
    to: '/admin/audit',
    title: 'Audit log',
    description: 'Explore financial changes with filters by user, entity, action and date.',
    icon: ScrollText,
  },
  {
    to: '/admin/health',
    title: 'System health',
    description: 'Deploy version, recent client errors and Supabase connectivity.',
    icon: Activity,
  },
  {
    to: '/admin/categories',
    title: 'Categories',
    description: 'Activate, deactivate or phase out contribution and expense categories.',
    icon: FolderTree,
  },
  {
    to: '/admin/sub-accounts',
    title: 'Sub-accounts & Group FS',
    description: 'Assign Group Financial Secretary users to the CMO/CWO sub-accounts.',
    icon: Wallet,
  },
];

export function AdminConsolePage() {
  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Admin Console</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        Operational tools for running the portal. Every action here is additionally protected by
        database Row Level Security.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-colors hover:border-brand-300">
                <CardHeader>
                  <div className="flex items-center gap-2 text-brand-700">
                    <Icon aria-hidden="true" className="size-5" />
                    <CardTitle>{tool.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-ink-700">{tool.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
