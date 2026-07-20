import { describe, expect, it } from 'vitest';

import {
  annualSummaryFilename,
  grandTotal,
  isGenerationBlocked,
  rollupByCategory,
} from '@/lib/annualSummary/summary';

describe('annual summary aggregation (story 8.3)', () => {
  const nameById = (id: string) =>
    ({ dues: 'Annual Dues', cwo: 'CWO Levy', gift: 'Building Fund' })[id] ?? id;

  it('rolls contributions up by category, largest first, coercing string amounts', () => {
    const rows = [
      { category_id: 'dues', amount: '100.50' },
      { category_id: 'dues', amount: 49.5 },
      { category_id: 'gift', amount: '500' },
      { category_id: 'cwo', amount: 25 },
    ];
    const result = rollupByCategory(rows, nameById);
    expect(result).toEqual([
      { categoryId: 'gift', name: 'Building Fund', total: 500 },
      { categoryId: 'dues', name: 'Annual Dues', total: 150 },
      { categoryId: 'cwo', name: 'CWO Levy', total: 25 },
    ]);
  });

  it('sums the grand total across category buckets', () => {
    const cats = rollupByCategory(
      [
        { category_id: 'dues', amount: 150 },
        { category_id: 'gift', amount: 500 },
      ],
      nameById,
    );
    expect(grandTotal(cats)).toBe(650);
  });

  it('blocks generation only when no signature path is present', () => {
    expect(isGenerationBlocked(null)).toBe(true);
    expect(isGenerationBlocked(undefined)).toBe(true);
    expect(isGenerationBlocked('')).toBe(true);
    expect(isGenerationBlocked('u1/signature.png')).toBe(false);
  });

  it('builds a deterministic filesystem-safe filename', () => {
    expect(annualSummaryFilename('Okeke Family', 2026)).toBe(
      'NICC-SJ_Annual_Summary_2026_Okeke_Family.pdf',
    );
    expect(annualSummaryFilename('  ', 2025)).toBe('NICC-SJ_Annual_Summary_2025_Family.pdf');
  });
});
