import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedTrainerStats,
  setCachedTrainerStats,
  invalidateTrainerStatsCache,
} from '../../src/lib/trainerStatsCache.ts';

describe('trainerStatsCache', () => {
  beforeEach(() => {
    invalidateTrainerStatsCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves cached stats before TTL expires', () => {
    const data = { assignedMembers: 5, activeNow: 2 };
    setCachedTrainerStats(10, data);

    expect(getCachedTrainerStats(10)).toEqual(data);
    expect(getCachedTrainerStats(99)).toBeNull();
  });

  it('expires cached stats after 45 seconds', () => {
    const data = { assignedMembers: 8 };
    setCachedTrainerStats('trainer_1', data);

    expect(getCachedTrainerStats('trainer_1')).toEqual(data);

    // Fast-forward 46 seconds
    vi.advanceTimersByTime(46_000);

    expect(getCachedTrainerStats('trainer_1')).toBeNull();
  });

  it('invalidates cache for a specific trainer or completely', () => {
    setCachedTrainerStats(1, { foo: 'bar' });
    setCachedTrainerStats(2, { baz: 'qux' });

    invalidateTrainerStatsCache(1);
    expect(getCachedTrainerStats(1)).toBeNull();
    expect(getCachedTrainerStats(2)).not.toBeNull();

    invalidateTrainerStatsCache();
    expect(getCachedTrainerStats(2)).toBeNull();
  });
});
