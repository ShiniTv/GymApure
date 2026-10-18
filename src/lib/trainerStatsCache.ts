const CACHE_TTL_MS = 45_000;

interface CacheEntry {
  payload: unknown;
  expiresAt: number;
}

const trainerCache = new Map<string, CacheEntry>();
const staleTrainerCache = new Map<string, unknown>();

export function getCachedTrainerStats(trainerKey: string | number): unknown | null {
  const key = String(trainerKey);
  const entry = trainerCache.get(key);
  if (!entry) return null;
  if (Date.now() < entry.expiresAt) {
    return entry.payload;
  }
  trainerCache.delete(key);
  return null;
}

/** Returns expired payload for stale-while-revalidate; caller can refresh in background. */
export function getStaleTrainerStats(trainerKey: string | number): unknown | null {
  const key = String(trainerKey);
  const entry = trainerCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.payload;
  }
  return staleTrainerCache.get(key) ?? null;
}

export function setCachedTrainerStats(trainerKey: string | number, payload: unknown): void {
  const key = String(trainerKey);
  trainerCache.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  staleTrainerCache.set(key, payload);
}

export function invalidateTrainerStatsCache(trainerKey?: string | number): void {
  if (trainerKey !== undefined) {
    const key = String(trainerKey);
    trainerCache.delete(key);
    staleTrainerCache.delete(key);
  } else {
    trainerCache.clear();
    staleTrainerCache.clear();
  }
}
