import { Response, NextFunction } from 'express';
import { query } from '../../db/index.ts';
import type { AuthRequest } from './authTypes.ts';
import { asyncHandler } from './asyncHandler.ts';
import { trainerHasMemberAccess } from '../../lib/trainerAccess.ts';

/**
 * Staff roles bypass the check; members may only access their own user id (route param).
 * @deprecated Prefer requireMemberAccess for routes that include trainers.
 */
export function requireSelfOrRoles(paramName: string, ...staffRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const targetId = parseInt(req.params[paramName], 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (staffRoles.includes(user.role) || user.id === targetId) {
      next();
      return;
    }

    return res.status(403).json({ error: 'Permisos insuficientes' });
  };
}

/**
 * Members: self only. Full-access roles (admin, receptionist): any member.
 * Trainers: explicitly assigned members (or legacy routine-linked members).
 */
export function requireMemberAccess(paramName: string, ...fullAccessRoles: string[]) {
  return asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const targetId = parseInt(req.params[paramName], 10);
    if (Number.isNaN(targetId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (user.id === targetId) {
      next();
      return;
    }

    if (fullAccessRoles.includes(user.role)) {
      next();
      return;
    }

    if (user.role === 'trainer') {
      const allowed = await trainerHasMemberAccess(user.id, targetId);
      if (allowed) {
        next();
        return;
      }
    }

    res.status(403).json({ error: 'Permisos insuficientes' });
  });
}

function resolveSessionId(req: AuthRequest): number | null {
  const raw = req.params.sessionId ?? req.body?.session_id;
  if (raw === undefined || raw === null || raw === '') return null;
  const id = parseInt(String(raw), 10);
  return Number.isNaN(id) ? null : id;
}

/** Members: own session only. Trainers: assigned members only. */
export const requireWorkoutSessionAccess = asyncHandler(async (req, res, next) => {
  const user = (req as AuthRequest).user;
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const sessionId = resolveSessionId(req);
  if (sessionId === null) {
    res.status(400).json({ error: 'session_id inválido' });
    return;
  }

  const { rows } = await query<{ user_id: number }>(
    'SELECT user_id FROM workout_sessions WHERE id = $1',
    [sessionId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'Sesión no encontrada' });
    return;
  }

  const ownerId = Number(rows[0].user_id);

  if (user.role === 'member') {
    if (ownerId !== Number(user.id)) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }
    next();
    return;
  }

  if (user.role === 'trainer') {
    const allowed = await trainerHasMemberAccess(user.id, ownerId);
    if (!allowed) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }
    next();
    return;
  }

  if (user.role === 'admin' || user.role === 'receptionist') {
    next();
    return;
  }

  res.status(403).json({ error: 'Permisos insuficientes' });
});
