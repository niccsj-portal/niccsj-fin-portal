import { describe, expect, it } from 'vitest';

import {
  householdFormSchema,
  memberFormSchema,
  toHouseholdInput,
  toMemberInput,
} from '@/lib/members/validation';

const validForm = {
  member_number: '79',
  first_name: 'Ada',
  last_name: 'Okafor',
  email: '',
  phone: '',
  address: '',
  joined_date: '2026-06-26',
  household_id: '',
  role_in_household: '',
  baptism_status: '',
  is_active: true,
};

describe('memberFormSchema', () => {
  it('accepts a minimal valid member and coerces the number', () => {
    const parsed = memberFormSchema.parse(validForm);
    expect(parsed.member_number).toBe(79);
    expect(typeof parsed.member_number).toBe('number');
  });

  it('requires first and last name', () => {
    expect(memberFormSchema.safeParse({ ...validForm, first_name: '' }).success).toBe(false);
    expect(memberFormSchema.safeParse({ ...validForm, last_name: '  ' }).success).toBe(false);
  });

  it('rejects a non-positive member number', () => {
    expect(memberFormSchema.safeParse({ ...validForm, member_number: '0' }).success).toBe(false);
    expect(memberFormSchema.safeParse({ ...validForm, member_number: '-3' }).success).toBe(false);
  });

  it('rejects an invalid email but allows blank', () => {
    expect(memberFormSchema.safeParse({ ...validForm, email: 'nope' }).success).toBe(false);
    expect(memberFormSchema.safeParse({ ...validForm, email: '' }).success).toBe(true);
    expect(
      memberFormSchema.safeParse({ ...validForm, email: 'a@b.com' }).success,
    ).toBe(true);
  });

  it('rejects an out-of-range baptism status', () => {
    expect(
      memberFormSchema.safeParse({ ...validForm, baptism_status: 'maybe' }).success,
    ).toBe(false);
  });
});

describe('toMemberInput', () => {
  it('maps blank optional fields to null', () => {
    const input = toMemberInput(memberFormSchema.parse(validForm));
    expect(input.email).toBeNull();
    expect(input.phone).toBeNull();
    expect(input.household_id).toBeNull();
    expect(input.role_in_household).toBeNull();
    expect(input.baptism_status).toBeNull();
    expect(input.first_name).toBe('Ada');
  });

  it('preserves provided optional values', () => {
    const input = toMemberInput(
      memberFormSchema.parse({
        ...validForm,
        email: 'ada@example.com',
        household_id: 'h1',
        role_in_household: 'head',
        baptism_status: 'baptized',
      }),
    );
    expect(input.email).toBe('ada@example.com');
    expect(input.household_id).toBe('h1');
    expect(input.role_in_household).toBe('head');
    expect(input.baptism_status).toBe('baptized');
  });
});

describe('householdFormSchema + toHouseholdInput', () => {
  it('requires a name', () => {
    expect(householdFormSchema.safeParse({ name: '', primary_member_id: '' }).success).toBe(false);
  });

  it('maps a blank primary member to null', () => {
    const input = toHouseholdInput(
      householdFormSchema.parse({ name: 'Eze Family', primary_member_id: '' }),
    );
    expect(input).toEqual({ name: 'Eze Family', primary_member_id: null });
  });
});
