import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, tokensMatch } from '../../lib/csrf.ts';
import { env } from '../../config/env.ts';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths that do not require CSRF (public auth, cron, pre-auth). */
const CSRF_EXEMPT_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/mfa/verify-login',
  '/api/auth/config',
  '/api/health',
  '/api/settings/expiry/run',
  '/api/exchange-rate/refresh',
];

function isCsrfExempt(path: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const path = req.path.startsWith('/api/v1') ? req.path.replace(/^\/api\/v1/, '/api') : req.path;
  if (isCsrfExempt(path)) {
    next();
    return;
  }

  // Same-origin monolith: skip CSRF when no CORS_ORIGINS configured (typical Render deploy).
  if (!env.CORS_ORIGINS?.trim() && env.NODE_ENV === 'production') {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!tokensMatch(cookieToken, headerToken)) {
    res.status(403).json({ error: 'Token CSRF inválido o ausente' });
    return;
  }

  next();
}
