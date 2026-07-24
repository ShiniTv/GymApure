import crypto from 'crypto';
import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.ts';
import { redisDel, redisGet, redisSet } from './redis.ts';

export const MFA_TRUSTED_COOKIE = 'mfa_device';
export const MFA_TRUST_DAYS = 30;
export const MFA_TRUST_TTL_SECONDS = MFA_TRUST_DAYS * 24 * 60 * 60;

const TRUST_PREFIX = 'mfa-trust:';

/** In-memory fallback when Redis is unavailable (dev / single node). */
const memoryTrust = new Map<string, number>();

function trustKey(userId: number, tokenHash: string): string {
  return `${TRUST_PREFIX}${userId}:${tokenHash}`;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function pruneMemory() {
  const now = Date.now();
  for (const [key, expires] of memoryTrust) {
    if (expires <= now) memoryTrust.delete(key);
  }
}

export const mfaTrustedCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: MFA_TRUST_TTL_SECONDS * 1000,
};

export const clearMfaTrustedCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export async function isTrustedMfaDevice(
  userId: number,
  rawToken: string | undefined
): Promise<boolean> {
  if (!rawToken || rawToken.length < 32) return false;
  const key = trustKey(userId, hashToken(rawToken));

  const fromRedis = await redisGet(key);
  if (fromRedis) return true;

  pruneMemory();
  const expires = memoryTrust.get(key);
  return expires != null && expires > Date.now();
}

export async function issueTrustedMfaDevice(res: Response, userId: number): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const key = trustKey(userId, hashToken(rawToken));
  const expiresAt = Date.now() + MFA_TRUST_TTL_SECONDS * 1000;

  const stored = await redisSet(key, '1', MFA_TRUST_TTL_SECONDS);
  if (!stored) {
    pruneMemory();
    memoryTrust.set(key, expiresAt);
  }

  res.cookie(MFA_TRUSTED_COOKIE, rawToken, mfaTrustedCookieOptions);
}

export async function revokeTrustedMfaDevice(
  res: Response,
  userId: number,
  rawToken: string | undefined
): Promise<void> {
  if (rawToken && rawToken.length >= 32) {
    const key = trustKey(userId, hashToken(rawToken));
    await redisDel(key);
    memoryTrust.delete(key);
  }
  res.clearCookie(MFA_TRUSTED_COOKIE, clearMfaTrustedCookieOptions);
}
