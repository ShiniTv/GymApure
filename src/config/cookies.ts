import type { CookieOptions } from 'express';
import { env } from './env.ts';

/** JWT lifetime aligned with cookie maxAge (8 hours). */
export const AUTH_TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: AUTH_TOKEN_MAX_AGE_MS,
};

export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};
