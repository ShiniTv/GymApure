import { describe, expect, it } from 'vitest';
import { DEFAULT_GYM_ID, resolveRequestGymId } from '../../src/lib/tenant.ts';

describe('tenant', () => {
  it('defaults to gym 1', () => {
    expect(DEFAULT_GYM_ID).toBe(1);
    expect(resolveRequestGymId()).toBe(1);
    expect(resolveRequestGymId({})).toBe(1);
  });

  it('honors explicit gym_id', () => {
    expect(resolveRequestGymId({ gym_id: 3 })).toBe(3);
  });
});
