/**
 * Role badge slot (backlog 0.10, gfx §8.9).
 *
 * Renders the user's role as a chip on the top bar. Sprint 1 (auth +
 * RBAC stories) supplies the `role` value from the Supabase session;
 * until then App.tsx may pass a static placeholder so the design slot
 * is visible. When `role` is undefined the slot collapses entirely.
 */
interface RoleBadgeProps {
  role?: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) return null;

  return (
    <span
      className="inline-flex items-center rounded-md bg-brand-700 px-2.5 py-1 text-caption font-medium uppercase tracking-wider text-accent-600"
      aria-label={`Current role: ${role}`}
    >
      {role}
    </span>
  );
}
