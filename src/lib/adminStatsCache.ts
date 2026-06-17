const CACHE_TTL_MS = 45_000;

let cache: { payload: unknown; expiresAt: number } | null = null;

export function getCachedAdminStats<T>(): T | null {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.payload as T;
  }
  return null;
}

export function setCachedAdminStats(payload: unknown): void {
  cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function invalidateAdminStatsCache(): void {
  cache = null;
}
