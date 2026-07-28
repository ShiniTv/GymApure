import type { Router } from 'express';
import { query } from '../../db/index.ts';
import { AuthRequest, authorize } from '../middleware/auth.ts';
import { requireMemberAccess } from '../middleware/access.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { formatZodError } from '../../lib/passwordPolicy.ts';
import { assignRoutineSchema } from '../../lib/routineSchemas.ts';
import {
  isActiveMember,
  trainerOwnsRoutine,
  ensureTrainerMemberAssignment,
} from '../../lib/trainerAccess.ts';
import { notifyRoutineAssigned } from '../../lib/chat/eventMessages.ts';
import { logger } from '../../lib/logger.ts';

const ROUTINE_EXERCISE_PREVIEW_JOIN = `LEFT JOIN LATERAL (
    SELECT string_agg(preview_names.name, ' · ') AS exercise_preview
    FROM (
      SELECT e.name
      FROM routine_exercises re
      JOIN exercises e ON e.id = re.exercise_id
      WHERE re.routine_id = r.id
      ORDER BY re.id
      LIMIT 3
    ) preview_names
  ) preview ON true`;

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

export function mountUserRoutineRoutes(router: Router): void {
  router.get('/:id/routines', requireMemberAccess('id'), async (req: AuthRequest, res) => {
    try {
      const trainerScope = req.user!.role === 'trainer' ? ' AND r.trainer_id = $2' : '';
      const params = req.user!.role === 'trainer' ? [req.params.id, req.user!.id] : [req.params.id];

      const { rows } = await query(
        `SELECT r.*, ur.assigned_at, ur.start_date, ur.end_date, ur.scheduled_weekdays,
                COALESCE(ec.exercise_count, 0)::int AS exercise_count,
                preview.exercise_preview
         FROM routines r
         JOIN user_routines ur ON r.id = ur.routine_id
         LEFT JOIN (
           SELECT routine_id, COUNT(*)::int AS exercise_count
           FROM routine_exercises
           GROUP BY routine_id
         ) ec ON ec.routine_id = r.id
         ${ROUTINE_EXERCISE_PREVIEW_JOIN}
         WHERE ur.user_id = $1${trainerScope}
         ORDER BY ur.assigned_at DESC`,
        params
      );
      res.json(rows);
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  router.post(
    '/:id/routines',
    authorize(['trainer']),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseInt(req.params.id, 10);
      if (Number.isNaN(memberId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const parsed = assignRoutineSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const { routine_id, start_date, end_date, scheduled_weekdays } = parsed.data;
      if (start_date > end_date) {
        res.status(400).json({
          error: 'La fecha de inicio debe ser anterior o igual a la de fin',
        });
        return;
      }

      const trainerId = req.user!.id;
      const ownsRoutine = await trainerOwnsRoutine(trainerId, routine_id);
      if (!ownsRoutine) {
        res.status(403).json({ error: 'No puedes asignar una rutina que no te pertenece' });
        return;
      }

      const memberOk = await isActiveMember(memberId);
      if (!memberOk) {
        res.status(404).json({ error: 'Miembro no encontrado o inactivo' });
        return;
      }

      await ensureTrainerMemberAssignment(trainerId, memberId, trainerId);

      const assigned_by = trainerId;
      const existing = await query<{ id: number }>(
        `SELECT id FROM user_routines WHERE user_id = $1 AND routine_id = $2 LIMIT 1`,
        [memberId, routine_id]
      );

      if (existing.rows.length > 0) {
        const { rows } = await query<{ id: number }>(
          `UPDATE user_routines
           SET start_date = $1, end_date = $2, scheduled_weekdays = $3,
               assigned_by = $4, assigned_at = NOW()
           WHERE user_id = $5 AND routine_id = $6
           RETURNING id`,
          [start_date, end_date, scheduled_weekdays ?? null, assigned_by, memberId, routine_id]
        );
        res.json({ id: rows[0].id, success: true, updated: true });

        void notifyRoutineAssigned(memberId, routine_id).catch((err: unknown) => {
          logger.error('Error enviando notificacion de rutina asignada', {
            error: getErrorMessage(err),
          });
        });
        return;
      }

      const { rows } = await query<{ id: number }>(
        `INSERT INTO user_routines (
           user_id, routine_id, assigned_by, start_date, end_date, scheduled_weekdays
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [memberId, routine_id, assigned_by, start_date, end_date, scheduled_weekdays ?? null]
      );
      res.json({ id: rows[0].id, success: true, updated: false });

      void notifyRoutineAssigned(memberId, routine_id).catch((err: unknown) => {
        logger.error('Error enviando notificacion de rutina asignada', {
          error: getErrorMessage(err),
        });
      });
    })
  );

  router.delete(
    '/:id/routines/:routineId',
    authorize(['trainer']),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseInt(req.params.id, 10);
      const routineId = parseInt(req.params.routineId, 10);
      if (Number.isNaN(memberId) || Number.isNaN(routineId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const trainerId = req.user!.id;
      const ownsRoutine = await trainerOwnsRoutine(trainerId, routineId);
      if (!ownsRoutine) {
        res.status(403).json({ error: 'No puedes modificar una rutina que no te pertenece' });
        return;
      }

      const { rowCount } = await query(
        'DELETE FROM user_routines WHERE user_id = $1 AND routine_id = $2',
        [memberId, routineId]
      );

      if (!rowCount) {
        res.status(404).json({ error: 'Asignación no encontrada' });
        return;
      }

      res.json({ success: true });
    })
  );
}
