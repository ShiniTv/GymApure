import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeWorkoutStreak } from '../../src/lib/workoutStreak';

describe('computeWorkoutStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty array', () => {
    expect(computeWorkoutStreak([])).toBe(0);
  });

  it('counts 1 if only worked out today', () => {
    expect(computeWorkoutStreak(['2026-10-03T09:00:00Z'])).toBe(1);
  });

  it('counts 1 if worked out yesterday (anchor fallback)', () => {
    expect(computeWorkoutStreak(['2026-10-02T18:00:00Z'])).toBe(1);
  });

  it('counts multi-day consecutive streak', () => {
    const dates = [
      '2026-10-03T08:00:00Z',
      '2026-10-02T08:00:00Z',
      '2026-10-01T08:00:00Z',
      '2026-09-30T08:00:00Z',
    ];
    expect(computeWorkoutStreak(dates)).toBe(4);
  });

  it('deduplicates multiple sessions on the same calendar day', () => {
    const dates = [
      '2026-10-03T08:00:00Z',
      '2026-10-03T17:00:00Z',
      '2026-10-02T10:00:00Z',
    ];
    expect(computeWorkoutStreak(dates)).toBe(2);
  });

  it('breaks streak when a day is skipped', () => {
    const dates = [
      '2026-10-03T08:00:00Z',
      '2026-10-01T08:00:00Z', // skipped Oct 2
    ];
    expect(computeWorkoutStreak(dates)).toBe(1);
  });

  it('returns 0 if last workout was 2 or more days ago', () => {
    const dates = ['2026-10-01T08:00:00Z'];
    expect(computeWorkoutStreak(dates)).toBe(0);
  });
});
