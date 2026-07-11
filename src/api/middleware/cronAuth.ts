import { type NextFunction, type Response } from 'express';
import type { AuthRequest } from './authTypes.ts';
import { isValidCronSecret } from '../../lib/secretCompare.ts';

export function extractCronSecret(req: AuthRequest): string | null {
  const headerSecret =
    (typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'] : null) ??
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace(/^Bearer\s+/i, '')
      : null);
  return headerSecret?.trim() || null;
}

export function isValidCronRequest(req: AuthRequest): boolean {
  return isValidCronSecret(extractCronSecret(req));
}

/** Cron jobs accept only CRON_SECRET — admin UI uses authenticated /api/settings/* routes. */
export function authorizeCronOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (isValidCronRequest(req)) {
    next();
    return;
  }

  return res.status(403).json({ error: 'CRON_SECRET inválido o ausente' });
}

/** @deprecated Use authorizeCronOnly — admin sessions no longer trigger cron endpoints. */
export const authorizeCronOrAdmin = authorizeCronOnly;
