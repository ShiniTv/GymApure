import { Response, NextFunction } from 'express';
import type { AuthRequest } from './authTypes.ts';
import { ADMIN_OVERSIGHT_ROLES } from '../../lib/roles.ts';

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
};

/** Shorthand for admin-only routes. */
export const requireAdmin = authorize(ADMIN_OVERSIGHT_ROLES);
