import type { CookieOptions } from 'express';
import { env } from './env.ts';

/** JWT lifetime aligned with cookie maxAge (8 hours). */
export const AUTH_TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/** Secure cookies need HTTPS; CI / local prod builds often serve plain http. */
const publicAppIsHttps = (env.PUBLIC_APP_URL ?? '').startsWith('https://');
const secureCookies =
  env.NODE_ENV === 'production' && process.env.CI !== 'true' && publicAppIsHttps;

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: 'lax',
  path: '/',
  maxAge: AUTH_TOKEN_MAX_AGE_MS,
};

export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: 'lax',
  path: '/',
};
