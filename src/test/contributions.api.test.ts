import { describe, expect, it } from 'vitest';

import {
  createCategory,
  createContribution,
  getContribution,
  listCategories,
  listContributions,
  updateContribution,
  voidContribution,
} from '@/lib/contributions/api';
import type { ContributionInput } from '@/lib/contributions/types';
import { makeAppClient } from './helpers/fakeDb';

const baseInput: ContributionInput = {
  household_id: 'h1',
  member_id: 'm1',
  category_id: 'cat1',
  amount: 50,
  contribution_date: '2025-03-01',
  payment_method: 'cash',
  notes: null,
};

describe('categories api (stories 4.1/4.3)', () => {
  it('scopes listCategories to income + active and orders by name', async () => {
    const { client, calls } = makeAppClient({
      tables: { categories: { rows: [{ id: 'cat1', name: 'CMO Dues' }] } },
    });
    const rows = await listCategories(client, { type: 'income', activeOnly: true });
    expect(rows).toHaveLength(1);
    expect(calls.filters).toContainEqual(['type', 'income']);
    expect(calls.filters).toContainEqual(['is_active', true]);
    expect(calls.ordered[0][0]).toBe('name');
  });

  it('creates an ad-hoc donation sub-category', async () => {
    const { client, calls } = makeAppClient({
      tables: { categories: { single: { id: 'd2', name: 'Funeral Support' } } },
    });
    const created = await createCategory(client, {
      name: 'Funeral Support',
      type: 'income',
      parent_id: 'donations',
    });
    expect(created.id).toBe('d2');
    expect(calls.inserted).toMatchObject({
      name: 'Funeral Support',
      type: 'income',
      parent_id: 'donations',
    });
  });
});

describe('contributions api (stories 4.2/4.4/4.5)', () => {
  it('lists active rows, applies equality filters and orders newest first', async () => {
    const { client, calls } = makeAppClient({
      tables: { contributions: { rows: [{ id: 'c1' }] } },
    });
    await listContributions(client, { householdId: 'h1', categoryId: 'cat1' });
    expect(calls.filters).toContainEqual(['is_active', true]);
    expect(calls.filters).toContainEqual(['household_id', 'h1']);
    expect(calls.filters).toContainEqual(['category_id', 'cat1']);
    expect(calls.ordered[0]).toEqual(['contribution_date', { ascending: false }]);
  });

  it('can include voided rows when activeOnly is false', async () => {
    const { client, calls } = makeAppClient({
      tables: { contributions: { rows: [] } },
    });
    await listContributions(client, { activeOnly: false });
    expect(calls.filters).not.toContainEqual(['is_active', true]);
  });

  it('inserts a new contribution and returns the created row', async () => {
    const { client, calls } = makeAppClient({
      tables: { contributions: { single: { id: 'new1' } } },
    });
    const row = await createContribution(client, baseInput);
    expect(row.id).toBe('new1');
    expect(calls.inserted).toMatchObject({ household_id: 'h1', amount: 50 });
  });

  it('reads a single contribution by id', async () => {
    const { client, calls } = makeAppClient({
      tables: { contributions: { single: { id: 'c1' } } },
    });
    const row = await getContribution(client, 'c1');
    expect(row.id).toBe('c1');
    expect(calls.filters).toContainEqual(['id', 'c1']);
  });

  it('updates a contribution with a correction reason (story 4.5)', async () => {
    const { client, calls } = makeAppClient({
      tables: { contributions: { single: { id: 'c1' } } },
    });
    await updateContribution(client, 'c1', { amount: 60, correction_reason: 'Wrong amount' });
    expect(calls.updated).toMatchObject({ amount: 60, correction_reason: 'Wrong amount' });
    expect(calls.filters).toContainEqual(['id', 'c1']);
  });

  it('soft-voids (never hard-deletes) a contribution', async () => {
    const { client, calls } = makeAppClient({
      tables: { contributions: { rows: [] } },
    });
    await voidContribution(client, 'c1', 'duplicate entry');
    expect(calls.updated).toMatchObject({ is_active: false, correction_reason: 'duplicate entry' });
    expect(calls.filters).toContainEqual(['id', 'c1']);
  });

  it('throws when the database returns an error', async () => {
    const { client } = makeAppClient({
      tables: { contributions: { single: null, error: { message: 'boom' } } },
    });
    await expect(createContribution(client, baseInput)).rejects.toThrow('boom');
  });
});
