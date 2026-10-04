const CACHE_TTL_MS = 45_000;

interface CacheEntry {
  payload: unknown;
  expiresAt: number;
}

const trainerCache = new Map<string, CacheEntry>();

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

export function setCachedTrainerStats(trainerKey: string | number, payload: unknown): void {
  const key = String(trainerKey);
  trainerCache.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateTrainerStatsCache(trainerKey?: string | number): void {
  if (trainerKey !== undefined) {
    trainerCache.delete(String(trainerKey));
  } else {
    trainerCache.clear();
  }
}
