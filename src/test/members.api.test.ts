import { describe, expect, it } from 'vitest';

import {
  createHousehold,
  createMember,
  deactivateMember,
  getMember,
  listHouseholds,
  listMembers,
  nextMemberNumber,
  setPrimaryMember,
  updateMember,
} from '@/lib/members/api';
import type { MemberInput, MemberRow } from '@/lib/members/types';
import { makeMembersClient } from './helpers/fakeDb';

const sampleRow: MemberRow = {
  id: 'm1',
  member_number: 1,
  first_name: 'Ada',
  last_name: 'Okafor',
  email: 'ada@example.com',
  phone: null,
  address: null,
  joined_date: '2020-01-01',
  household_id: 'h1',
  role_in_household: 'head',
  baptism_status: 'baptized',
  is_active: true,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
};

const sampleInput: MemberInput = {
  member_number: 79,
  first_name: 'New',
  last_name: 'Member',
  email: null,
  phone: null,
  address: null,
  joined_date: '2026-06-26',
  household_id: null,
  role_in_household: null,
  baptism_status: null,
  is_active: true,
};

describe('listMembers', () => {
  it('orders by member_number and returns the rows', async () => {
    const { client, from, calls } = makeMembersClient({ rows: [sampleRow] });
    const result = await listMembers(client);
    expect(from).toHaveBeenCalledWith('members');
    expect(calls.ordered).toEqual([['member_number', { ascending: true }]]);
    expect(result).toEqual([sampleRow]);
  });

  it('filters active members server-side', async () => {
    const { client, calls } = makeMembersClient({ rows: [] });
    await listMembers(client, { status: 'active' });
    expect(calls.filters).toContainEqual(['is_active', true]);
  });

  it('filters inactive members server-side', async () => {
    const { client, calls } = makeMembersClient({ rows: [] });
    await listMembers(client, { status: 'inactive' });
    expect(calls.filters).toContainEqual(['is_active', false]);
  });

  it('filters by household when provided', async () => {
    const { client, calls } = makeMembersClient({ rows: [] });
    await listMembers(client, { householdId: 'h1' });
    expect(calls.filters).toContainEqual(['household_id', 'h1']);
  });

  it('throws when the query errors', async () => {
    const { client } = makeMembersClient({ error: { message: 'boom' } });
    await expect(listMembers(client)).rejects.toThrow('boom');
  });
});

describe('getMember', () => {
  it('selects a single member by id', async () => {
    const { client, calls } = makeMembersClient({ single: sampleRow });
    const result = await getMember(client, 'm1');
    expect(calls.filters).toContainEqual(['id', 'm1']);
    expect(result).toEqual(sampleRow);
  });
});

describe('nextMemberNumber', () => {
  it('returns the RPC suggestion as a number', async () => {
    const { client, rpc } = makeMembersClient({ nextNumber: 79 });
    expect(await nextMemberNumber(client)).toBe(79);
    expect(rpc).toHaveBeenCalledWith('next_member_number');
  });

  it('throws when the RPC errors', async () => {
    const { client } = makeMembersClient({ rpcError: true });
    await expect(nextMemberNumber(client)).rejects.toThrow('rpc failed');
  });
});

describe('createMember', () => {
  it('inserts the input and returns the created row', async () => {
    const { client, calls } = makeMembersClient({ single: { ...sampleRow, member_number: 79 } });
    const result = await createMember(client, sampleInput);
    expect(calls.inserted).toEqual(sampleInput);
    expect(result.member_number).toBe(79);
  });
});

describe('updateMember', () => {
  it('updates by id with the patch', async () => {
    const { client, calls } = makeMembersClient({ single: sampleRow });
    await updateMember(client, 'm1', { first_name: 'Adaeze' });
    expect(calls.updated).toEqual({ first_name: 'Adaeze' });
    expect(calls.filters).toContainEqual(['id', 'm1']);
  });
});

describe('deactivateMember', () => {
  it('soft-deletes by setting is_active false', async () => {
    const { client, calls } = makeMembersClient({ rows: [] });
    await deactivateMember(client, 'm1');
    expect(calls.updated).toEqual({ is_active: false });
    expect(calls.filters).toContainEqual(['id', 'm1']);
  });
});

describe('households', () => {
  it('lists households ordered by name', async () => {
    const { client, from, calls } = makeMembersClient({ rows: [] });
    await listHouseholds(client);
    expect(from).toHaveBeenCalledWith('households');
    expect(calls.ordered).toEqual([['name', { ascending: true }]]);
  });

  it('creates a household', async () => {
    const { client, calls } = makeMembersClient({ single: { id: 'h2' } });
    await createHousehold(client, { name: 'Eze Family', primary_member_id: null });
    expect(calls.inserted).toEqual({ name: 'Eze Family', primary_member_id: null });
  });

  it('sets the primary member', async () => {
    const { client, calls } = makeMembersClient({ rows: [] });
    await setPrimaryMember(client, 'h1', 'm1');
    expect(calls.updated).toEqual({ primary_member_id: 'm1' });
    expect(calls.filters).toContainEqual(['id', 'h1']);
  });
});
