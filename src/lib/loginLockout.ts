import { redisDel, redisGet, redisIncr, redisSet } from './redis.ts';

const LOGIN_PREFIX = 'login-attempt:';
const LOCK_PREFIX = 'login-lock:';

const MAX_LOGIN_ATTEMPTS = 3;
export const LOGIN_BLOCK_MINUTES = 15;
const LOGIN_WINDOW_MINUTES = 15;

interface LoginAttemptEntry {
  count: number;
  windowExpires: number;
  lockedUntil?: number;
}

const memoryAttempts = new Map<string, LoginAttemptEntry>();

function memoryGetLockUntil(email: string): number | null {
  const entry = memoryAttempts.get(email);
  if (!entry) return null;

  const now = Date.now();
  if (entry.lockedUntil != null && now < entry.lockedUntil) {
    return entry.lockedUntil;
  }

  if (now >= entry.windowExpires) {
    memoryAttempts.delete(email);
  }
  return null;
}

/** Returns lockedUntil epoch ms when this failure triggers or extends a lock. */
function memoryRecordAttempt(email: string, success: boolean): number | null {
  if (success) {
    memoryAttempts.delete(email);
    return null;
  }

  const now = Date.now();
  const entry = memoryAttempts.get(email);

  if (!entry || now >= entry.windowExpires) {
    memoryAttempts.set(email, {
      count: 1,
      windowExpires: now + LOGIN_WINDOW_MINUTES * 60 * 1000,
    });
    return null;
  }

  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_BLOCK_MINUTES * 60 * 1000;
    return entry.lockedUntil;
  }
  return null;
}

/** Epoch ms until which login is blocked, or null if not locked. */
export async function getLoginLockUntil(email: string): Promise<number | null> {
  const normalizedEmail = email.toLowerCase();
  const lockKey = `${LOCK_PREFIX}${normalizedEmail}`;
  const lockedUntilRaw = await redisGet(lockKey);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (!Number.isNaN(lockedUntil) && Date.now() < lockedUntil) {
      return lockedUntil;
    }
    await redisDel(lockKey);
  }

  return memoryGetLockUntil(normalizedEmail);
}

export async function checkLoginBlock(email: string): Promise<boolean> {
  return (await getLoginLockUntil(email)) != null;
}

/**
 * Record success (clears lock) or failure.
 * On failure that triggers lock, returns lockedUntil epoch ms.
 */
export async function recordLoginAttempt(email: string, success: boolean): Promise<number | null> {
  const normalizedEmail = email.toLowerCase();
  if (success) {
    memoryAttempts.delete(normalizedEmail);
    await redisDel(`${LOGIN_PREFIX}${normalizedEmail}`);
    await redisDel(`${LOCK_PREFIX}${normalizedEmail}`);
    return null;
  }

  const attemptKey = `${LOGIN_PREFIX}${normalizedEmail}`;
  const count = await redisIncr(attemptKey, LOGIN_WINDOW_MINUTES * 60);
  if (count != null) {
    if (count >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = Date.now() + LOGIN_BLOCK_MINUTES * 60 * 1000;
      await redisSet(
        `${LOCK_PREFIX}${normalizedEmail}`,
        String(lockedUntil),
        LOGIN_BLOCK_MINUTES * 60
      );
      return lockedUntil;
    }
    return null;
  }

  return memoryRecordAttempt(normalizedEmail, false);
}

export function lockoutPayload(lockedUntil: number): {
  error: string;
  locked_until: number;
  retry_after_seconds: number;
} {
  const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000));
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return {
    error: `Demasiados intentos. Cuenta bloqueada. Inténtalo de nuevo en ${minutes} min.`,
    locked_until: lockedUntil,
    retry_after_seconds: retryAfterSeconds,
  };
}
