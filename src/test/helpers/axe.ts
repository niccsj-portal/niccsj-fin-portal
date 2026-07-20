import axe from 'axe-core';

/**
 * Run axe-core against a rendered container and return WCAG 2.0/2.1 A & AA
 * violations (Sprint 9 story 9.8). This is the automated companion to the
 * manual Lighthouse + axe DevTools pass — it fails the build if a key page
 * regresses on a conformance rule.
 *
 * `color-contrast` is disabled because jsdom has no layout/paint engine, so
 * contrast can't be computed reliably in unit tests — it stays part of the
 * manual Lighthouse pass. Landmark/page-structure best-practice rules are out
 * of scope here too (components are rendered in isolation, not the full shell);
 * scoping to the wcag2a/wcag2aa tags keeps the gate on real conformance rules.
 */
export async function findAxeViolations(
  container: HTMLElement,
): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations;
}

/** Compact, readable summary of violations for a failing assertion message. */
export function summarizeViolations(violations: axe.Result[]): string[] {
  return violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`);
}
