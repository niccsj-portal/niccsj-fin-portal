import { describe, expect, it } from 'vitest';

import {
  subAccountTransactionSchema,
  toTransactionInput,
} from '@/lib/subAccounts/validation';

describe('sub-account transaction validation (story 6.3)', () => {
  it('accepts a valid income entry', () => {
    const parsed = subAccountTransactionSchema.safeParse({
      direction: 'income',
      amount: '125.50',
      txn_date: '2026-03-01',
      category_id: '',
      payee: '',
      description: '',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(125.5);
  });

  it('rejects a non-positive amount', () => {
    const parsed = subAccountTransactionSchema.safeParse({
      direction: 'expense',
      amount: '0',
      txn_date: '2026-03-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown direction', () => {
    const parsed = subAccountTransactionSchema.safeParse({
      direction: 'transfer',
      amount: '10',
      txn_date: '2026-03-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a missing date', () => {
    const parsed = subAccountTransactionSchema.safeParse({
      direction: 'income',
      amount: '10',
      txn_date: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('normalises blank optional fields to null and attaches the sub-account id', () => {
    const input = toTransactionInput('sub-1', {
      direction: 'expense',
      amount: 40,
      txn_date: '2026-03-05',
      category_id: '',
      payee: '   ',
      description: '',
    });
    expect(input).toEqual({
      sub_account_id: 'sub-1',
      direction: 'expense',
      category_id: null,
      member_id: null,
      payee: null,
      description: null,
      amount: 40,
      txn_date: '2026-03-05',
    });
  });

  it('carries a member_id through for a dues attribution', () => {
    const input = toTransactionInput('sub-1', {
      direction: 'income',
      amount: 20,
      txn_date: '2026-03-05',
      category_id: 'cmo-dues',
      member_id: 'm1',
      payee: 'Ada Obi (#12)',
      description: '',
    });
    expect(input.member_id).toBe('m1');
    expect(input.payee).toBe('Ada Obi (#12)');
  });
});
