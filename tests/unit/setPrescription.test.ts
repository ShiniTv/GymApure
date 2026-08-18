import { describe, expect, it } from 'vitest';
import {
  deriveSetPrescription,
  formatSetPrescriptionSummary,
  hasDetailedSetPrescription,
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

  it('parses plates, effort and load', () => {
    const parsed = parseSetPrescriptionFromApi([
      { set_number: 1, reps: 40, plates: 5, effort: 'time', load: 'plates' },
    ]);
    expect(parsed?.[0]).toMatchObject({
      plates: 5,
      effort: 'time',
      load: 'plates',
      reps: 40,
    });
  });

  it('summarizes time and plates', () => {
    expect(
      formatSetPrescriptionSummary([
        { set_number: 1, reps: 40, weight_kg: null, plates: 5, effort: 'time', load: 'plates' },
        { set_number: 2, reps: 40, weight_kg: null, plates: 6, effort: 'time', load: 'plates' },
      ])
    ).toBe('5 placas × 40s · 6 placas × 40s');
  });

  it('treats uniform plates as not detailed', () => {
    const rows = [
      { set_number: 1, reps: 10, weight_kg: null, plates: 4, effort: 'reps' as const, load: 'plates' as const },
      { set_number: 2, reps: 10, weight_kg: null, plates: 4, effort: 'reps' as const, load: 'plates' as const },
    ];
    expect(hasDetailedSetPrescription(rows)).toBe(false);
    expect(
      hasDetailedSetPrescription([
        rows[0],
        { ...rows[1], plates: 6 },
      ])
    ).toBe(true);
  });
});
