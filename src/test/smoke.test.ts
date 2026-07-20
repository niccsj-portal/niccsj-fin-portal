import { describe, it, expect } from 'vitest';

// Story 0.2 acceptance: the Vitest runner works (red -> green).
// This is the smallest test that proves the test pipeline is wired up.
describe('test runner', () => {
  it('runs and passes a trivial assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('has access to TypeScript types', () => {
    const value: string = 'NICC-SJ';
    expect(value).toBe('NICC-SJ');
  });
});
