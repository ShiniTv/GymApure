const CACHE_TTL_MS = 75_000;

let cache: { payload: unknown; expiresAt: number } | null = null;
let stale: { payload: unknown } | null = null;

export function getCachedAdminStats(): unknown | null {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.payload;
  }
  return null;
}

/** Returns expired payload for stale-while-revalidate; caller must refresh in background. */
export function getStaleAdminStats(): unknown | null {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.payload;
  }
  return stale?.payload ?? null;
}

export function setCachedAdminStats(payload: unknown): void {
  cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
  stale = { payload };
}

export function invalidateAdminStatsCache(): void {
  cache = null;
}
