import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  approveExpense,
  getExpense,
  listExpenses,
  listNotifications,
  markNotificationRead,
  rejectExpense,
  submitExpense,
} from '@/lib/expenses/api';
import type { ExpenseInput } from '@/lib/expenses/types';
import { makeAppClient } from './helpers/fakeDb';

const baseInput: ExpenseInput = {
  category_id: 'cat1',
  payee: 'PG&E',
  description: 'Hall electricity',
  amount: 120,
  expense_date: '2026-06-01',
  receipt_path: null,
};

/** A client whose `functions.invoke` is a spy returning the given result. */
function makeFunctionsClient(result: { data?: unknown; error?: { message: string } | null }) {
  const invoke = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }));
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  return { client, invoke };
}

describe('expenses read api (story 5.5)', () => {
  it('lists active rows, applies equality filters and orders newest first', async () => {
    const { client, calls } = makeAppClient({
      tables: { expenses: { rows: [{ id: 'e1' }] } },
    });
    await listExpenses(client, { status: 'pending', categoryId: 'cat1' });
    expect(calls.filters).toContainEqual(['is_active', true]);
    expect(calls.filters).toContainEqual(['status', 'pending']);
    expect(calls.filters).toContainEqual(['category_id', 'cat1']);
    expect(calls.ordered[0]).toEqual(['expense_date', { ascending: false }]);
  });

  it('can include archived rows when activeOnly is false', async () => {
    const { client, calls } = makeAppClient({ tables: { expenses: { rows: [] } } });
    await listExpenses(client, { activeOnly: false });
    expect(calls.filters).not.toContainEqual(['is_active', true]);
  });

  it('gets one expense by id', async () => {
    const { client, calls } = makeAppClient({
      tables: { expenses: { single: { id: 'e9' } } },
    });
    const row = await getExpense(client, 'e9');
    expect(row.id).toBe('e9');
    expect(calls.filters).toContainEqual(['id', 'e9']);
  });
});

describe('expense workflow api via Edge Functions (stories 5.3/5.4)', () => {
  it('submitExpense invokes submit-expense with the input body', async () => {
    const { client, invoke } = makeFunctionsClient({ data: { id: 'e1', status: 'pending' } });
    const row = await submitExpense(client, baseInput);
    expect(invoke).toHaveBeenCalledWith('submit-expense', { body: baseInput });
    expect(row.id).toBe('e1');
  });

  it('approveExpense invokes approve-expense with the expense id', async () => {
    const { client, invoke } = makeFunctionsClient({ data: { id: 'e1', status: 'approved' } });
    const row = await approveExpense(client, 'e1');
    expect(invoke).toHaveBeenCalledWith('approve-expense', { body: { expense_id: 'e1' } });
    expect(row.status).toBe('approved');
  });

  it('rejectExpense invokes reject-expense with id + reason', async () => {
    const { client, invoke } = makeFunctionsClient({ data: { id: 'e1', status: 'rejected' } });
    const row = await rejectExpense(client, 'e1', 'Out of budget');
    expect(invoke).toHaveBeenCalledWith('reject-expense', {
      body: { expense_id: 'e1', reason: 'Out of budget' },
    });
    expect(row.status).toBe('rejected');
  });

  it('throws when an Edge Function returns an error', async () => {
    const { client } = makeFunctionsClient({ error: { message: 'forbidden' } });
    await expect(approveExpense(client, 'e1')).rejects.toThrow('forbidden');
  });
});

describe('expense notifications api (story 5.7)', () => {
  it('lists the caller notifications newest first', async () => {
    const { client, calls } = makeAppClient({
      tables: { expense_notifications: { rows: [{ id: 'n1' }] } },
    });
    await listNotifications(client);
    expect(calls.ordered[0]).toEqual(['notified_at', { ascending: false }]);
  });

  it('can scope to unread only', async () => {
    const { client, calls } = makeAppClient({
      tables: { expense_notifications: { rows: [] } },
    });
    await listNotifications(client, { unreadOnly: true });
    expect(calls.filters).toContainEqual(['is_read', false]);
  });

  it('marks a notification read', async () => {
    const { client, calls } = makeAppClient({
      tables: { expense_notifications: { rows: [] } },
    });
    await markNotificationRead(client, 'n1');
    expect(calls.updated).toMatchObject({ is_read: true });
    expect(calls.filters).toContainEqual(['id', 'n1']);
  });
});
