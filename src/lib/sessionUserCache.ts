import type { DbSessionUser } from './sessionAuth.ts';

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

interface CacheEntry {
  user: DbSessionUser;
  cachedAt: number;
}

const cache = new Map<number, CacheEntry>();

let cacheHits = 0;
let cacheMisses = 0;

export function getCachedSessionUser(userId: number): DbSessionUser | null {
  const entry = cache.get(userId);
  if (!entry) {
    cacheMisses += 1;
    return null;
  }

  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(userId);
    cacheMisses += 1;
    return null;
  }

  cacheHits += 1;
  return entry.user;
}

export function setCachedSessionUser(user: DbSessionUser): void {
  if (cache.size >= MAX_ENTRIES && !cache.has(user.id)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(user.id, { user, cachedAt: Date.now() });
}

export function invalidateSessionUserCache(userId: number): void {
  cache.delete(userId);
}

export function getSessionCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    entries: cache.size,
    hitRatePercent: total > 0 ? Number(((cacheHits / total) * 100).toFixed(2)) : 0,
  };
}
