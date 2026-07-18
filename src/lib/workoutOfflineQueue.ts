/**
 * Offline queue for workout set logs. Keeps optimistic UI when the gym Wi‑Fi drops.
 */
import { apiFetch, isNetworkError } from './api';
import { clientLogger } from './clientLogger';

const QUEUE_KEY = 'workout_offline_log_queue';
const ROUTINE_CACHE_PREFIX = 'workout_routine_cache_';

export interface QueuedWorkoutLog {
  session_id: number;
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  queued_at: number;
}

function readQueue(): QueuedWorkoutLog[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedWorkoutLog[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedWorkoutLog[]) {
  if (items.length === 0) {
    localStorage.removeItem(QUEUE_KEY);
    return;
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueueWorkoutLog(entry: Omit<QueuedWorkoutLog, 'queued_at'>) {
  const queue = readQueue().filter(
    (q) =>
      !(
        q.session_id === entry.session_id &&
        q.exercise_id === entry.exercise_id &&
        q.set_number === entry.set_number
      )
  );
  queue.push({ ...entry, queued_at: Date.now() });
  writeQueue(queue);
}

export function pendingWorkoutLogCount(sessionId?: number | null): number {
  const queue = readQueue();
  if (sessionId == null) return queue.length;
  return queue.filter((q) => q.session_id === sessionId).length;
}

export function cacheWorkoutRoutine(routineId: number | string, routine: unknown) {
  try {
    localStorage.setItem(`${ROUTINE_CACHE_PREFIX}${routineId}`, JSON.stringify(routine));
  } catch (err) {
    clientLogger.error('Failed to cache workout routine', err);
  }
}

export function readCachedWorkoutRoutine(routineId: number | string): unknown | null {
  try {
    const raw = localStorage.getItem(`${ROUTINE_CACHE_PREFIX}${routineId}`);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

let flushInFlight: Promise<number> | null = null;

/** Flush queued logs. Returns number successfully synced. */
export async function flushWorkoutLogQueue(sessionId?: number | null): Promise<number> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const queue = readQueue();
    const targets = sessionId == null ? queue : queue.filter((q) => q.session_id === sessionId);
    if (targets.length === 0) return 0;

    const remaining = queue.filter((q) => !targets.includes(q));
    let synced = 0;

    for (const item of targets) {
      try {
        await apiFetch('/api/workouts/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: item.session_id,
            exercise_id: item.exercise_id,
            set_number: item.set_number,
            weight: item.weight,
            reps: item.reps,
          }),
        });
        synced += 1;
      } catch (err) {
        remaining.push(item);
        if (!isNetworkError(err)) {
          clientLogger.error('Failed to sync queued workout log', err);
        }
        break;
      }
    }

    writeQueue(remaining);
    return synced;
  })();

  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

export function clearWorkoutLogQueueForSession(sessionId: number) {
  writeQueue(readQueue().filter((q) => q.session_id !== sessionId));
}
