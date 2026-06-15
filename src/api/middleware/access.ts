import { Response, NextFunction } from 'express';
import { query } from '../../db/index.ts';
import type { AuthRequest } from './auth.ts';
import { asyncHandler } from './asyncHandler.ts';

/**
 * Staff roles bypass the check; members may only access their own user id (route param).
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
      return next();
    }

    return res.status(403).json({ error: 'Permisos insuficientes' });
  };
}

function resolveSessionId(req: AuthRequest): number | null {
  const raw = req.params.sessionId ?? req.body?.session_id;
  if (raw === undefined || raw === null || raw === '') return null;
  const id = parseInt(String(raw), 10);
  return Number.isNaN(id) ? null : id;
}

/** Members may only mutate their own workout session; staff may mutate any. */
export const requireWorkoutSessionAccess = asyncHandler(async (req, res, next) => {
  const user = (req as AuthRequest).user;
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  if (user.role === 'admin' || user.role === 'trainer') {
    next();
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

  if (rows[0].user_id !== user.id) {
    res.status(403).json({ error: 'Permisos insuficientes' });
    return;
  }

  next();
});
