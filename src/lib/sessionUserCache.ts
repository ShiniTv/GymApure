import type { DbSessionUser } from './sessionAuth.ts';
import { redisDel, redisGet, redisSet, isRedisConfigured } from './redis.ts';

const TTL_MS = 45_000;
const TTL_SECONDS = Math.ceil(TTL_MS / 1000);
const MAX_ENTRIES = 500;
const REDIS_KEY_PREFIX = 'session:user:';

interface CacheEntry {
  user: DbSessionUser;
  cachedAt: number;
}

const cache = new Map<number, CacheEntry>();

let cacheHits = 0;
let cacheMisses = 0;

function redisKey(userId: number): string {
  return `${REDIS_KEY_PREFIX}${userId}`;
}

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

/** Async lookup: memory first, then Redis when configured. */
export async function getCachedSessionUserAsync(userId: number): Promise<DbSessionUser | null> {
  const local = getCachedSessionUser(userId);
  if (local) return local;

  if (!isRedisConfigured()) return null;

  try {
    const raw = await redisGet(redisKey(userId));
    if (!raw) return null;
    const user = JSON.parse(raw) as DbSessionUser;
    if (!user?.id) return null;
    // Repopulate local without counting as miss again
    cacheHits += 1;
    cacheMisses = Math.max(0, cacheMisses - 1);
    setCachedSessionUserLocal(user);
    return user;
  } catch {
    return null;
  }
}

function setCachedSessionUserLocal(user: DbSessionUser): void {
  if (cache.size >= MAX_ENTRIES && !cache.has(user.id)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(user.id, { user, cachedAt: Date.now() });
}

export function setCachedSessionUser(user: DbSessionUser): void {
  setCachedSessionUserLocal(user);
  if (isRedisConfigured()) {
    void redisSet(redisKey(user.id), JSON.stringify(user), TTL_SECONDS);
  }
}

export function invalidateSessionUserCache(userId: number): void {
  cache.delete(userId);
  if (isRedisConfigured()) {
    // Best-effort sync path for callers that cannot await; prefer invalidateSessionUserCacheAsync.
    void redisDel(redisKey(userId));
  }
}

/** Clears memory + Redis before token_version bumps so stale sessions cannot rehydrate. */
export async function invalidateSessionUserCacheAsync(userId: number): Promise<void> {
  cache.delete(userId);
  if (isRedisConfigured()) {
    await redisDel(redisKey(userId));
  }
}

export function getSessionCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    entries: cache.size,
    hitRatePercent: total > 0 ? Number(((cacheHits / total) * 100).toFixed(2)) : 0,
    ttlMs: TTL_MS,
    redis: isRedisConfigured(),
  };
}
