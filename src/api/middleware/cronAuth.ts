import { type NextFunction, type Response } from 'express';
import type { AuthRequest } from './authTypes.ts';
import { isValidCronSecret } from '../../lib/secretCompare.ts';
import { sessionFailureStatus, verifySessionToken } from '../../lib/sessionAuth.ts';

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

/**
 * Cron routes mount before global `authenticate`, so admin session must be
 * resolved here when `CRON_SECRET` is not provided.
 */
export function authorizeCronOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (isValidCronRequest(req)) {
    next();
    return;
  }

  void (async () => {
    try {
      if (req.user?.role === 'admin') {
        next();
        return;
      }

      const token = req.cookies?.token;
      if (!token) {
        res.status(401).json({ error: 'No autorizado - Inicie sesión' });
        return;
      }

      const result = await verifySessionToken(token);
      if (result.type !== 'success') {
        const status = sessionFailureStatus(result);
        res.status(status!).json({
          error: status === 403 ? 'Cuenta inactiva. Contacta al administrador.' : 'Sesión expirada',
        });
        return;
      }

      if (result.user.role !== 'admin') {
        res.status(403).json({ error: 'Permisos insuficientes' });
        return;
      }

      req.user = result.user;
      next();
    } catch (err) {
      next(err);
    }
  })();
}
