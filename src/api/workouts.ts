import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest } from './middleware/auth.ts';
import { requireWorkoutSessionAccess } from './middleware/access.ts';
import { trainerHasMemberRoutineAccess } from '../lib/trainerAccess.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import {
  startWorkoutSchema,
  logWorkoutSchema,
  finishWorkoutSchema,
  cancelWorkoutSchema,
} from './workoutSchemas.ts';

const router = asyncRouter();

router.post(
  '/start',
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = startWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { user_id: targetUserId, routine_id } = parsed.data;
    const user = req.user!;

    if (user.role === 'member' && user.id !== targetUserId) {
      res.status(403).json({ error: 'No tienes permiso para iniciar este entrenamiento' });
      return;
    }

    if (user.role === 'member') {
      const assigned = await query(
        'SELECT id FROM user_routines WHERE user_id = $1 AND routine_id = $2',
        [targetUserId, routine_id]
      );
      if (!assigned.rows[0]) {
        res.status(403).json({ error: 'Rutina no asignada' });
        return;
      }
    } else if (user.role === 'trainer') {
      const allowed = await trainerHasMemberRoutineAccess(user.id, targetUserId, routine_id);
      if (!allowed) {
        res.status(403).json({ error: 'Rutina no asignada a este miembro' });
        return;
      }
    }

    const existing = await query(
      `SELECT id, start_time FROM workout_sessions
     WHERE user_id = $1 AND routine_id = $2 AND end_time IS NULL
     ORDER BY start_time DESC LIMIT 1`,
      [targetUserId, routine_id]
    );

    if (existing.rows[0]) {
      const session = existing.rows[0];
      const logs = await query(
        `SELECT exercise_id, set_number, weight, reps
       FROM workout_logs WHERE session_id = $1`,
        [session.id]
      );
      res.json({
        id: session.id,
        start_time: session.start_time,
        status: 'resumed',
        logs: logs.rows,
      });
      return;
    }

    const insert = await query(
      `INSERT INTO workout_sessions (user_id, routine_id)
     VALUES ($1, $2)
     RETURNING id, start_time`,
      [targetUserId, routine_id]
    );

    const newSession = insert.rows[0];
    res.json({
      id: newSession.id,
      start_time: newSession.start_time,
      status: 'started',
      logs: [],
    });
  })
);

router.post(
  '/log',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    const parsed = logWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { session_id, exercise_id, set_number, weight, reps } = parsed.data;

    const { rows } = await query(
      `INSERT INTO workout_logs (session_id, exercise_id, set_number, weight, reps)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (session_id, exercise_id, set_number)
     DO UPDATE SET weight = EXCLUDED.weight, reps = EXCLUDED.reps
     RETURNING id`,
      [session_id, exercise_id, set_number, weight, reps]
    );
    res.json({ id: rows[0].id, success: true });
  })
);

router.post(
  '/finish',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    const parsed = finishWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { session_id, success } = parsed.data;

    await query(
      `UPDATE workout_sessions
     SET end_time = NOW(), success = $1
     WHERE id = $2`,
      [success ? 1 : 0, session_id]
    );
    res.json({ success: true });
  })
);

router.post(
  '/cancel',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    const parsed = cancelWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { session_id } = parsed.data;

    const { rowCount } = await query(
      `UPDATE workout_sessions
     SET end_time = NOW(), success = 0
     WHERE id = $1 AND end_time IS NULL`,
      [session_id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
      return;
    }
    await query('DELETE FROM workout_logs WHERE session_id = $1', [session_id]);
    res.json({ success: true });
  })
);

router.patch(
  '/sessions/:sessionId/success',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { success } = req.body;

    if (typeof success !== 'boolean') {
      res.status(400).json({ error: 'success debe ser un booleano' });
      return;
    }

    await query(`UPDATE workout_sessions SET success = $1 WHERE id = $2`, [success, sessionId]);
    res.json({ success: true });
  })
);

router.get(
  '/sessions/:sessionId',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ error: 'ID de sesión inválido' });
      return;
    }

    const sessionResult = await query<{
      id: number;
      start_time: string;
      end_time: string | null;
      success: number;
      routine_id: number;
      routine_name: string;
      user_id: number;
      member_name: string;
    }>(
      `SELECT ws.id, ws.start_time, ws.end_time, ws.success, ws.routine_id,
            r.name AS routine_name, ws.user_id, u.full_name AS member_name
     FROM workout_sessions ws
     JOIN routines r ON ws.routine_id = r.id
     JOIN users u ON ws.user_id = u.id
     WHERE ws.id = $1`,
      [sessionId]
    );

    const session = sessionResult.rows[0];
    if (!session) {
      res.status(404).json({ error: 'Sesión no encontrada' });
      return;
    }

    const [plannedResult, logsResult] = await Promise.all([
      query<{
        exercise_id: number;
        name: string;
        muscle_group: string;
        planned_sets: number;
        planned_reps: number;
      }>(
        `SELECT re.exercise_id, e.name, e.muscle_group,
              re.sets AS planned_sets, re.reps AS planned_reps
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = $1
       ORDER BY re.id`,
        [session.routine_id]
      ),
      query<{
        exercise_id: number;
        set_number: number;
        weight: number;
        reps: number;
      }>(
        `SELECT exercise_id, set_number, weight, reps
       FROM workout_logs
       WHERE session_id = $1
       ORDER BY exercise_id, set_number`,
        [sessionId]
      ),
    ]);

    const logsByExercise = new Map<
      number,
      { set_number: number; weight: number; reps: number }[]
    >();
    for (const log of logsResult.rows) {
      const list = logsByExercise.get(log.exercise_id) ?? [];
      list.push({
        set_number: log.set_number,
        weight: Number(log.weight),
        reps: Number(log.reps),
      });
      logsByExercise.set(log.exercise_id, list);
    }

    let setsLogged = 0;
    let setsPlanned = 0;
    let totalVolumeKg = 0;

    const exercises = plannedResult.rows.map((row) => {
      const logs = logsByExercise.get(row.exercise_id) ?? [];
      setsLogged += logs.length;
      setsPlanned += row.planned_sets;
      for (const log of logs) {
        totalVolumeKg += log.weight * log.reps;
      }
      logsByExercise.delete(row.exercise_id);
      return {
        exercise_id: row.exercise_id,
        name: row.name,
        muscle_group: row.muscle_group,
        planned_sets: row.planned_sets,
        planned_reps: row.planned_reps,
        logs,
      };
    });

    for (const [exerciseId, logs] of logsByExercise) {
      setsLogged += logs.length;
      for (const log of logs) {
        totalVolumeKg += log.weight * log.reps;
      }
      exercises.push({
        exercise_id: exerciseId,
        name: 'Ejercicio',
        muscle_group: '',
        planned_sets: 0,
        planned_reps: 0,
        logs,
      });
    }

    res.json({
      id: session.id,
      routine_id: session.routine_id,
      routine_name: session.routine_name,
      start_time: session.start_time,
      end_time: session.end_time,
      success: session.success === 1,
      member: { id: session.user_id, full_name: session.member_name },
      exercises,
      summary: {
        sets_logged: setsLogged,
        sets_planned: setsPlanned,
        total_volume_kg: Math.round(totalVolumeKg),
      },
    });
  })
);

export default router;
