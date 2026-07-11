import crypto from 'crypto';
import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.ts';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const CSRF_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: CSRF_MAX_AGE_MS,
};

export const clearCsrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: Response, token?: string): string {
  const value = token ?? generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, value, csrfCookieOptions);
  return value;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, clearCsrfCookieOptions);
}

export function tokensMatch(cookieToken: unknown, headerToken: unknown): boolean {
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') return false;
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
