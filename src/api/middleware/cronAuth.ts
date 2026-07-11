import { type NextFunction, type Response } from 'express';
import type { AuthRequest } from './authTypes.ts';
import { authorize } from './authorize.ts';
import { env } from '../../config/env.ts';

export function extractCronSecret(req: AuthRequest): string | null {
  const headerSecret =
    (typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'] : null) ??
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace(/^Bearer\s+/i, '')
      : null);
  return headerSecret?.trim() || null;
}

export function isValidCronRequest(req: AuthRequest): boolean {
  const cronSecret = env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const headerSecret = extractCronSecret(req);
  return headerSecret === cronSecret;
}

export function authorizeCronOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (isValidCronRequest(req)) {
    next();
    return;
  }

  return authorize(['admin'])(req, res, next);
}
