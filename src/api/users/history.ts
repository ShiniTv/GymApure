import type { Router } from 'express';
import { query } from '../../db/index.ts';
import { AuthRequest } from '../middleware/auth.ts';
import { requireMemberAccess } from '../middleware/access.ts';
import { parsePaginationQuery, type PaginatedResult } from '../../lib/pagination.ts';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

export function mountUserHistoryRoutes(router: Router): void {
  router.get('/:id/history', requireMemberAccess('id'), async (req: AuthRequest, res) => {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { page, pageSize, offset } = parsePaginationQuery(req.query, { pageSize: 20 });
    const trainerScope = req.user!.role === 'trainer' ? ' AND r.trainer_id = $2' : '';
    const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;

    try {
      const countParams = trainerId ? [userId, trainerId] : [userId];
      const listParams = trainerId
        ? [userId, trainerId, pageSize, offset]
        : [userId, pageSize, offset];

      const [countResult, weekResult, activeResult, listResult] = await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM workout_sessions ws
           JOIN routines r ON ws.routine_id = r.id
           WHERE ws.user_id = $1 AND ws.end_time IS NOT NULL${trainerScope}`,
          countParams
        ),
        query<{ count: string }>(
          `SELECT COUNT(DISTINCT DATE(ws.start_time))::text AS count
           FROM workout_sessions ws
           JOIN routines r ON ws.routine_id = r.id
           WHERE ws.user_id = $1
             AND ws.end_time IS NOT NULL
             AND ws.success = 1
             AND ws.start_time >= DATE_TRUNC('week', CURRENT_DATE)${trainerScope}`,
          countParams
        ),
        query(
          `SELECT ws.id, ws.start_time, ws.end_time, ws.success, ws.routine_id,
                  r.name AS routine_name,
                  COALESCE(wl.sets_completed, 0)::int AS sets_completed
           FROM workout_sessions ws
           JOIN routines r ON ws.routine_id = r.id
           LEFT JOIN (
             SELECT session_id, COUNT(*)::int AS sets_completed
             FROM workout_logs
             GROUP BY session_id
           ) wl ON wl.session_id = ws.id
           WHERE ws.user_id = $1 AND ws.end_time IS NULL${trainerScope}
           ORDER BY ws.start_time DESC`,
          countParams
        ),
        query(
          `SELECT ws.id, ws.start_time, ws.end_time, ws.success, ws.routine_id,
                  r.name AS routine_name,
                  COALESCE(wl.sets_completed, 0)::int AS sets_completed
           FROM workout_sessions ws
           JOIN routines r ON ws.routine_id = r.id
           LEFT JOIN (
             SELECT session_id, COUNT(*)::int AS sets_completed
             FROM workout_logs
             GROUP BY session_id
           ) wl ON wl.session_id = ws.id
           WHERE ws.user_id = $1 AND ws.end_time IS NOT NULL${trainerScope}
           ORDER BY ws.start_time DESC
           LIMIT $${trainerId ? 3 : 2} OFFSET $${trainerId ? 4 : 3}`,
          listParams
        ),
      ]);

      const total = parseInt(countResult.rows[0]?.count || '0', 10);
      const workoutsThisWeek = parseInt(weekResult.rows[0]?.count || '0', 10);
      const payload: PaginatedResult<unknown> & {
        workoutsThisWeek: number;
        activeSessions: unknown[];
      } = {
        items: listResult.rows,
        activeSessions: activeResult.rows,
        total,
        page,
        pageSize,
        workoutsThisWeek,
      };

      res.json(payload);
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
}
