import {
  Bell,
  Building2,
  FileBadge,
  FileText,
  HandCoins,
  Home,
  PenLine,
  Receipt,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * App roles (PRD §4.1, technology.md §6.2). The string values match the
 * Postgres `app_role` enum created in migration 1.2 exactly — these are the
 * authoritative role identifiers stored in `public.users.role`.
 *
 * Authorization is enforced server-side by RLS (PRD §6.2); the values here
 * drive *presentation only* (which nav items / routes to show). The SPA never
 * trusts these for data access.
 */
export const APP_ROLES = [
  'member',
  'fin_secretary',
  'treasurer',
  'group_fin_sec',
  'chaplain',
  'finance_council',
  'admin',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/**
 * Feature flag (org decision 2026-09): member self-service logins are paused —
 * the portal runs as a leadership/back-office tool only. Nothing is deleted:
 * routes, RLS, and the `member` enum value all remain, so flipping this back to
 * `true` fully restores member self-service. While `false`, the Admin Console
 * will not offer `member` as an assignable role (see `assignableRoles`).
 */
export const MEMBER_SELF_SERVICE_ENABLED = false;

/**
 * Roles an admin may assign from the Console. When member self-service is
 * paused, `member` is withheld — but any role a user *already* holds is always
 * included by `assignableRoles` so existing assignments still render/select.
 */
export const ASSIGNABLE_ROLES: readonly AppRole[] = MEMBER_SELF_SERVICE_ENABLED
  ? APP_ROLES
  : APP_ROLES.filter((r) => r !== 'member');

/**
 * The role options to show for a user, preserving their current role even if it
 * is otherwise withheld (so a legacy `member` row remains visible + changeable).
 */
export function assignableRoles(currentRole: AppRole | null | undefined): AppRole[] {
  if (currentRole && !ASSIGNABLE_ROLES.includes(currentRole)) {
    return [currentRole, ...ASSIGNABLE_ROLES];
  }
  return [...ASSIGNABLE_ROLES];
}

/** Human-readable labels for the role badge and admin screens. */
export const ROLE_LABELS: Record<AppRole, string> = {
  member: 'Member',
  fin_secretary: 'Financial Secretary',
  treasurer: 'Treasurer',
  group_fin_sec: 'Group Financial Secretary',
  chaplain: 'Chaplain',
  finance_council: 'Finance Council',
  admin: 'System Admin',
};

/**
 * Roles for which TOTP 2FA applies (AR-6 hybrid policy, PRD §4.1):
 *  - System Admin: 2FA is MANDATORY.
 *  - FS / Treasurer / Group FS / Chaplain / Finance Council: OPT-IN.
 *  - Member: never required.
 */
export const TWO_FACTOR_MANDATORY_ROLES: readonly AppRole[] = ['admin'];
export const TWO_FACTOR_OPT_IN_ROLES: readonly AppRole[] = [
  'fin_secretary',
  'treasurer',
  'group_fin_sec',
  'chaplain',
  'finance_council',
];

export function isTwoFactorMandatory(role: AppRole): boolean {
  return TWO_FACTOR_MANDATORY_ROLES.includes(role);
}

export function isTwoFactorEligible(role: AppRole): boolean {
  return TWO_FACTOR_MANDATORY_ROLES.includes(role) || TWO_FACTOR_OPT_IN_ROLES.includes(role);
}

/**
 * Roles permitted to create / edit / deactivate member + household records.
 * Mirrors the `is_member_editor()` RLS predicate (migration 1.3) exactly:
 * Financial Secretary, Chaplain, System Admin. Treasurer is a privileged
 * *reader* only; Member and Finance Council cannot reach member CRUD
 * (backlog story 2.8). RLS remains the authoritative boundary.
 */
export const MEMBER_EDITOR_ROLES: readonly AppRole[] = ['fin_secretary', 'chaplain', 'admin'];

export function canEditMembers(role: AppRole | null | undefined): boolean {
  return !!role && MEMBER_EDITOR_ROLES.includes(role);
}

/**
 * Roles permitted to record/correct contributions on the main ledger.
 * Mirrors the `is_contribution_recorder()` RLS predicate (Sprint 4 migration)
 * exactly: Financial Secretary, Treasurer, System Admin. Note this differs
 * from `MEMBER_EDITOR_ROLES`: Chaplain is a privileged *reader* with full
 * per-member visibility but does NOT record on the main ledger (PRD §7 —
 * "Record contribution (main ledger)"). RLS remains the authoritative boundary.
 */
export const CONTRIBUTION_RECORDER_ROLES: readonly AppRole[] = [
  'fin_secretary',
  'treasurer',
  'admin',
];

export function canRecordContributions(role: AppRole | null | undefined): boolean {
  return !!role && CONTRIBUTION_RECORDER_ROLES.includes(role);
}

/**
 * Roles that may read every contribution (full per-member visibility, PRD §7
 * "View per-member financial details"). Mirrors the `is_privileged_reader()`
 * RLS predicate: Financial Secretary, Treasurer, Chaplain, Admin. These roles
 * see the admin ledger; everyone else (member, group FS, finance council) sees
 * only their own family view, scoped by RLS.
 */
export const PRIVILEGED_READER_ROLES: readonly AppRole[] = [
  'fin_secretary',
  'treasurer',
  'chaplain',
  'admin',
];

export function canViewAllContributions(role: AppRole | null | undefined): boolean {
  return !!role && PRIVILEGED_READER_ROLES.includes(role);
}

/**
 * Roles permitted to SUBMIT / edit a pending expense. Mirrors the
 * `is_expense_recorder()` RLS predicate (Sprint 5 migration) exactly:
 * Treasurer, Admin (PRD §7 "Submit expense"). The Treasurer submits; the
 * Chaplain approves — a submitter can never approve their own expense.
 */
export const EXPENSE_RECORDER_ROLES: readonly AppRole[] = ['treasurer', 'admin'];

export function canRecordExpenses(role: AppRole | null | undefined): boolean {
  return !!role && EXPENSE_RECORDER_ROLES.includes(role);
}

/**
 * Roles permitted to APPROVE / REJECT an expense (flip status). Mirrors the
 * `is_expense_approver()` RLS predicate: Chaplain, Admin (PRD §7 "Approve /
 * reject expense"). Chaplain holds final authority (decision AR-7).
 */
export const EXPENSE_APPROVER_ROLES: readonly AppRole[] = ['chaplain', 'admin'];

export function canApproveExpenses(role: AppRole | null | undefined): boolean {
  return !!role && EXPENSE_APPROVER_ROLES.includes(role);
}

/**
 * Roles that may READ the expense ledger — the "Notified of expenses" set
 * (PRD §7). Mirrors `is_expense_reader()`: Financial Secretary, Treasurer,
 * Chaplain, Finance Council, Admin.
 */
export const EXPENSE_READER_ROLES: readonly AppRole[] = [
  'fin_secretary',
  'treasurer',
  'chaplain',
  'finance_council',
  'admin',
];

export function canViewExpenses(role: AppRole | null | undefined): boolean {
  return !!role && EXPENSE_READER_ROLES.includes(role);
}

/**
 * Roles that OVERSEE every group sub-account (read all rollups, PRD §7).
 * Mirrors the `is_sub_account_overseer()` RLS predicate (Sprint 6 migration)
 * exactly: Financial Secretary, Treasurer, Finance Council, Admin. A Group
 * Financial Secretary is NOT an overseer — they are scoped to their assignment.
 */
export const SUB_ACCOUNT_OVERSEER_ROLES: readonly AppRole[] = [
  'fin_secretary',
  'treasurer',
  'finance_council',
  'admin',
];

export function canOverseeSubAccounts(role: AppRole | null | undefined): boolean {
  return !!role && SUB_ACCOUNT_OVERSEER_ROLES.includes(role);
}

/**
 * Roles that MANAGE a group sub-account ledger — record income/expense and
 * submit the monthly summary (PRD §4.5/§7). Group Financial Secretary and
 * Admin. The actual group(s) a manager can touch is decided server-side by the
 * `sub_account_users` assignment via RLS; this helper only gates the UI affordance.
 */
export const SUB_ACCOUNT_MANAGER_ROLES: readonly AppRole[] = ['group_fin_sec', 'admin'];

export function canManageSubAccounts(role: AppRole | null | undefined): boolean {
  return !!role && SUB_ACCOUNT_MANAGER_ROLES.includes(role);
}

/** Roles that may reach the Sub-accounts area at all (managers + overseers). */
export function canViewSubAccounts(role: AppRole | null | undefined): boolean {
  return canManageSubAccounts(role) || canOverseeSubAccounts(role);
}

/**
 * Roles permitted to view the consolidated financial statement (story 11.10;
 * PRD §4.5/§4.6/§7): the whole-parish view combining the general ledger and
 * every CMO/CWO sub-account. Restricted to roles that already read BOTH the
 * main ledger (privileged reader) AND every sub-account rollup (overseer):
 * Financial Secretary, Treasurer, Admin. Chaplain is deferred until an RLS
 * read grant on sub-account snapshots lands (PRD §7). RLS stays authoritative.
 */
export const CONSOLIDATED_STATEMENT_ROLES: readonly AppRole[] = [
  'fin_secretary',
  'treasurer',
  'admin',
];

export function canViewConsolidatedStatement(role: AppRole | null | undefined): boolean {
  return !!role && CONSOLIDATED_STATEMENT_ROLES.includes(role);
}

/**
 * Roles permitted to reach the Admin Console and its tools — user/role
 * management, audit-log explorer, health, category + sub-account assignment
 * (Sprint 9; PRD §4.11 "Admin"). Only System Admin. Mirrors the admin-only RLS
 * on `public.users` (role assignment) and `public.sub_account_users`
 * (assignments); RLS remains the authoritative boundary.
 */
export function canAdminister(role: AppRole | null | undefined): boolean {
  return role === 'admin';
}

export function roleLabel(role: AppRole | null | undefined): string {
  return role ? ROLE_LABELS[role] : '';
}

/**
 * A single primary-navigation entry. `roles` lists which roles may see the
 * item; it mirrors the PRD §7 permissions matrix. Visibility here is a
 * convenience — the route itself is still guarded by RequireRole and, on the
 * server, by RLS.
 */
export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  roles: readonly AppRole[];
}

const ALL_ROLES: readonly AppRole[] = APP_ROLES;

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', label: 'Home', path: '/dashboard', icon: Home, roles: ALL_ROLES },
  {
    key: 'profile',
    label: 'My profile',
    path: '/profile',
    icon: UserCircle,
    roles: ['member'],
  },
  {
    key: 'members',
    label: 'Members',
    path: '/members',
    icon: Users,
    roles: ['fin_secretary', 'treasurer', 'chaplain', 'admin'],
  },
  {
    key: 'households',
    label: 'Households',
    path: '/households',
    icon: Building2,
    roles: ['fin_secretary', 'treasurer', 'chaplain', 'admin'],
  },
  {
    key: 'contributions',
    label: 'Contributions',
    path: '/contributions',
    icon: HandCoins,
    roles: ALL_ROLES,
  },
  {
    key: 'expenses',
    label: 'Expenses',
    path: '/expenses',
    icon: Receipt,
    roles: ['fin_secretary', 'treasurer', 'chaplain', 'finance_council', 'admin'],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: Bell,
    roles: ['fin_secretary', 'treasurer', 'chaplain', 'finance_council', 'admin'],
  },
  {
    key: 'sub-accounts',
    label: 'Sub-accounts',
    path: '/sub-accounts',
    icon: Wallet,
    roles: ['group_fin_sec', 'fin_secretary', 'treasurer', 'finance_council', 'admin'],
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FileText,
    roles: ['fin_secretary', 'treasurer', 'group_fin_sec', 'chaplain', 'finance_council', 'admin'],
  },
  {
    key: 'consolidated-statement',
    label: 'Consolidated statement',
    path: '/reports/consolidated',
    icon: FileText,
    roles: CONSOLIDATED_STATEMENT_ROLES,
  },
  {
    key: 'annual-summary',
    label: 'Annual summary',
    path: '/annual-summary',
    icon: FileBadge,
    roles: ['member', 'fin_secretary', 'treasurer', 'chaplain', 'admin'],
  },
  {
    key: 'signature',
    label: 'Signature',
    path: '/signature',
    icon: PenLine,
    roles: ['fin_secretary', 'admin'],
  },
  {
    key: 'admin',
    label: 'Admin',
    path: '/admin',
    icon: ShieldCheck,
    roles: ['admin'],
  },
];

/** Nav items visible to the given role (null role → none). */
export function navItemsForRole(role: AppRole | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Whether a role may access the route owning `navKey`. */
export function canAccessNav(role: AppRole | null | undefined, navKey: string): boolean {
  if (!role) return false;
  const item = NAV_ITEMS.find((n) => n.key === navKey);
  return item ? item.roles.includes(role) : false;
}
