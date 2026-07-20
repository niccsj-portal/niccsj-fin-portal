import { describe, expect, it } from 'vitest';

import { validateImportRows } from '@/lib/members/import';

describe('validateImportRows', () => {
  it('maps a valid row and normalises mixed-case headers', () => {
    const preview = validateImportRows([
      {
        'Member Number': '12',
        'First Name': 'Ada',
        last_name: 'Okafor',
        email: 'ada@example.com',
        joined_date: '2021-03-01',
        baptism_status: 'baptized',
      },
    ]);
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(0);
    expect(preview.results[0].member).toMatchObject({
      member_number: 12,
      first_name: 'Ada',
      last_name: 'Okafor',
      email: 'ada@example.com',
      baptism_status: 'baptized',
      is_active: true,
      household_id: null,
    });
  });

  it('collects errors for invalid rows without throwing', () => {
    const preview = validateImportRows([
      { member_number: 'abc', first_name: '', last_name: 'X', joined_date: '' },
    ]);
    expect(preview.validCount).toBe(0);
    expect(preview.invalidCount).toBe(1);
    expect(preview.results[0].errors.length).toBeGreaterThan(0);
    expect(preview.results[0].member).toBeUndefined();
  });

  it('normalises blank optional fields to null', () => {
    const preview = validateImportRows([
      {
        member_number: '5',
        first_name: 'Bem',
        last_name: 'Eze',
        email: '',
        phone: '',
        address: '',
        joined_date: '2022-01-01',
      },
    ]);
    const member = preview.results[0].member!;
    expect(member.email).toBeNull();
    expect(member.phone).toBeNull();
    expect(member.address).toBeNull();
    expect(member.role_in_household).toBeNull();
  });

  it('rejects an invalid email', () => {
    const preview = validateImportRows([
      {
        member_number: '5',
        first_name: 'Bem',
        last_name: 'Eze',
        email: 'not-an-email',
        joined_date: '2022-01-01',
      },
    ]);
    expect(preview.invalidCount).toBe(1);
    expect(preview.results[0].errors.some((e) => /email/i.test(e))).toBe(true);
  });

  it('reports both valid and invalid rows in one pass', () => {
    const preview = validateImportRows([
      { member_number: '1', first_name: 'A', last_name: 'B', joined_date: '2020-01-01' },
      { member_number: '', first_name: '', last_name: '', joined_date: '' },
    ]);
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    expect(preview.results[0].rowNumber).toBe(1);
    expect(preview.results[1].rowNumber).toBe(2);
  });
});
