import { describe, expect, it } from 'vitest';
import {
  deriveSetPrescription,
  parseSetPrescriptionFromApi,
} from '../../src/lib/setPrescription.ts';

describe('setPrescription', () => {
  it('derives uniform rows from sets/reps', () => {
    const rows = deriveSetPrescription(3, 10);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.reps === 10)).toBe(true);
    expect(rows.map((r) => r.set_number)).toEqual([1, 2, 3]);
  });

  it('parses API payload or returns null', () => {
    expect(parseSetPrescriptionFromApi(null)).toBeNull();
    const parsed = parseSetPrescriptionFromApi([
      { set_number: 1, reps: 8 },
      { set_number: 2, reps: 6 },
    ]);
    expect(parsed?.[0]?.reps).toBe(8);
    expect(parsed?.[1]?.reps).toBe(6);
  });
});
