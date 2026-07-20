/**
 * Generic "coming soon" content for navigation destinations whose full
 * feature lands in a later sprint (Members → Sprint 2, Contributions →
 * Sprint 4, Expenses → Sprint 5, …). Keeping a real, role-guarded route here
 * lets Sprint 1 demonstrate the role-aware shell end-to-end without shipping
 * half-built features.
 */
export function PlaceholderPage({ title, sprint }: { title: string; sprint?: string }) {
  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">{title}</h1>
      <p className="mt-2 text-body text-ink-700">
        This section is coming soon{sprint ? ` (${sprint})` : ''}. The navigation and access rules
        are already in place.
      </p>
    </div>
  );
}
