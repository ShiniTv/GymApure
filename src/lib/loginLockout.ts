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

function memoryCheckBlock(email: string): boolean {
  const entry = memoryAttempts.get(email);
  if (!entry) return false;

  const now = Date.now();
  if (entry.lockedUntil != null && now < entry.lockedUntil) {
    return true;
  }

  if (now >= entry.windowExpires) {
    memoryAttempts.delete(email);
  }
  return false;
}

function memoryRecordAttempt(email: string, success: boolean) {
  if (success) {
    memoryAttempts.delete(email);
    return;
  }

  const now = Date.now();
  const entry = memoryAttempts.get(email);

  if (!entry || now >= entry.windowExpires) {
    memoryAttempts.set(email, {
      count: 1,
      windowExpires: now + LOGIN_WINDOW_MINUTES * 60 * 1000,
    });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_BLOCK_MINUTES * 60 * 1000;
  }
}

export async function checkLoginBlock(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const lockKey = `${LOCK_PREFIX}${normalizedEmail}`;
  const lockedUntilRaw = await redisGet(lockKey);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (!Number.isNaN(lockedUntil) && Date.now() < lockedUntil) {
      return true;
    }
    await redisDel(lockKey);
  }

  return memoryCheckBlock(normalizedEmail);
}

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  if (success) {
    memoryAttempts.delete(normalizedEmail);
    await redisDel(`${LOGIN_PREFIX}${normalizedEmail}`);
    await redisDel(`${LOCK_PREFIX}${normalizedEmail}`);
    return;
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
    }
    return;
  }

  memoryRecordAttempt(normalizedEmail, false);
}
