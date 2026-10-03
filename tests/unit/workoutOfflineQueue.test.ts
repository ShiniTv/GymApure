import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueWorkoutLog,
  pendingWorkoutLogCount,
  clearWorkoutLogQueueForSession,
  cacheWorkoutRoutine,
  readCachedWorkoutRoutine,
} from '../../src/lib/workoutOfflineQueue';

describe('workoutOfflineQueue', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    globalThis.localStorage = localStorageMock as unknown as Storage;
  });

  it('enqueues logs and updates pending count', () => {
    expect(pendingWorkoutLogCount()).toBe(0);

    enqueueWorkoutLog({
      session_id: 1,
      exercise_id: 10,
      set_number: 1,
      weight: 50,
      reps: 10,
    });
    expect(pendingWorkoutLogCount()).toBe(1);
    expect(pendingWorkoutLogCount(1)).toBe(1);
    expect(pendingWorkoutLogCount(2)).toBe(0);
  });

  it('updates entry if same session, exercise and set is enqueued again', () => {
    enqueueWorkoutLog({
      session_id: 1,
      exercise_id: 10,
      set_number: 1,
      weight: 50,
      reps: 10,
    });
    // User edits reps from 10 to 12 before syncing
    enqueueWorkoutLog({
      session_id: 1,
      exercise_id: 10,
      set_number: 1,
      weight: 55,
      reps: 12,
    });

    expect(pendingWorkoutLogCount(1)).toBe(1);
  });

  it('clears logs specifically for a finished session', () => {
    enqueueWorkoutLog({
      session_id: 1,
      exercise_id: 10,
      set_number: 1,
      weight: 50,
      reps: 10,
    });
    enqueueWorkoutLog({
      session_id: 2,
      exercise_id: 20,
      set_number: 1,
      weight: 30,
      reps: 15,
    });

    expect(pendingWorkoutLogCount()).toBe(2);

    clearWorkoutLogQueueForSession(1);
    expect(pendingWorkoutLogCount(1)).toBe(0);
    expect(pendingWorkoutLogCount(2)).toBe(1);
    expect(pendingWorkoutLogCount()).toBe(1);
  });

  it('caches and reads cached routines offline', () => {
    const dummyRoutine = { id: 42, name: 'Hipertrofia Pecho', exercises: [] };
    cacheWorkoutRoutine(42, dummyRoutine);

    const cached = readCachedWorkoutRoutine(42);
    expect(cached).toEqual(dummyRoutine);

    expect(readCachedWorkoutRoutine(999)).toBeNull();
  });
});
