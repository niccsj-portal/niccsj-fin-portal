import { describe, expect, it } from 'vitest';

import {
  assignSubAccountUser,
  addSubAccountCategory,
  createCategory,
  createSubAccount,
  listAuditLog,
  listCategories,
  listSubAccountCategories,
  listUsers,
  recentClientErrorCount,
  removeSubAccountCategory,
  removeSubAccountUser,
  setCategoryActive,
  setUserActive,
  updateUserRole,
} from '@/lib/admin/api';
import { makeAppClient } from './helpers/fakeDb';

describe('admin api', () => {
  it('lists users newest-first', async () => {
    const { client, calls } = makeAppClient({
      tables: { users: { rows: [{ id: 'u1', email: 'a@x.com', role: 'member' }] } },
    });
    const rows = await listUsers(client);
    expect(rows).toHaveLength(1);
    expect(calls.ordered).toContainEqual(['created_at', { ascending: false }]);
  });

  it('updates a user role scoped by id', async () => {
    const { client, calls } = makeAppClient();
    await updateUserRole(client, 'u9', 'treasurer');
    expect(calls.updated).toEqual({ role: 'treasurer' });
    expect(calls.filters).toContainEqual(['id', 'u9']);
  });

  it('soft-activates a user', async () => {
    const { client, calls } = makeAppClient();
    await setUserActive(client, 'u9', false);
    expect(calls.updated).toEqual({ is_active: false });
    expect(calls.filters).toContainEqual(['id', 'u9']);
  });

  it('applies audit-log filters and orders newest-first', async () => {
    const { client, calls } = makeAppClient({ tables: { audit_log: { rows: [] } } });
    await listAuditLog(client, {
      userId: 'u1',
      entity: 'members',
      action: 'update',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.999Z',
    });
    expect(calls.filters).toContainEqual(['user_id', 'u1']);
    expect(calls.filters).toContainEqual(['entity', 'members']);
    expect(calls.filters).toContainEqual(['action', 'update']);
    expect(calls.filters).toContainEqual(['occurred_at', '2026-01-01T00:00:00.000Z']);
    expect(calls.ordered).toContainEqual(['occurred_at', { ascending: false }]);
  });

  it('reads the recent client-error count via a head select', async () => {
    const { client } = makeAppClient({ tables: { client_errors: { count: 4 } } });
    const count = await recentClientErrorCount(client, '2026-06-01T00:00:00.000Z');
    expect(count).toBe(4);
  });

  it('lists and toggles categories', async () => {
    const { client, calls } = makeAppClient({
      tables: { categories: { rows: [{ id: 'c1', name: 'Offertory', type: 'income' }] } },
    });
    const rows = await listCategories(client);
    expect(rows).toHaveLength(1);
    await setCategoryActive(client, 'c1', false);
    expect(calls.updated).toEqual({ is_active: false });
    expect(calls.filters).toContainEqual(['id', 'c1']);
  });

  it('assigns and removes a sub-account user', async () => {
    const { client, calls } = makeAppClient();
    await assignSubAccountUser(client, 'sa1', 'u2');
    expect(calls.inserted).toEqual({ sub_account_id: 'sa1', user_id: 'u2' });
    await removeSubAccountUser(client, 'assign1');
    expect(calls.filters).toContainEqual(['id', 'assign1']);
  });

  it('creates a category (trimmed name, no parent)', async () => {
    const { client, calls } = makeAppClient({ tables: { categories: { single: { id: 'c1' } } } });
    await createCategory(client, { name: '  Youth Ministry  ', type: 'income' });
    expect(calls.inserted).toEqual({ name: 'Youth Ministry', type: 'income', parent_id: null });
  });

  it('creates a sub-account (lowercased slug, trimmed)', async () => {
    const { client, calls } = makeAppClient({ tables: { sub_accounts: { single: { id: 'sa1' } } } });
    await createSubAccount(client, { name: '  Youth Group  ', slug: '  YOUTH  ' });
    expect(calls.inserted).toEqual({ slug: 'youth', name: 'Youth Group', description: null });
  });

  it('lists, adds and removes a sub-account category mapping', async () => {
    const { client, calls } = makeAppClient({
      tables: {
        sub_account_categories: {
          rows: [{ id: 'm1', sub_account_id: 'sa1', category_id: 'c1', created_at: '' }],
        },
      },
    });
    const rows = await listSubAccountCategories(client);
    expect(rows).toHaveLength(1);
    await addSubAccountCategory(client, 'sa1', 'c2');
    expect(calls.inserted).toEqual({ sub_account_id: 'sa1', category_id: 'c2' });
    await removeSubAccountCategory(client, 'm1');
    expect(calls.filters).toContainEqual(['id', 'm1']);
  });
});
