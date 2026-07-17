import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireWorkoutSessionAccess } from './middleware/access.ts';
import { trainerHasMemberRoutineAccess } from '../lib/trainerAccess.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';
import {
  startWorkoutSchema,
  logWorkoutSchema,
  finishWorkoutSchema,
  cancelWorkoutSchema,
} from './workoutSchemas.ts';

const router = asyncRouter();

router.get(
  '/progress',
  authorize(['member']),
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { rows: weeklyRows } = await query<{
      week_start: string;
      volume_kg: string;
      max_weight_kg: string;
      workouts: number;
    }>(
      `WITH weeks AS (
         SELECT generate_series(
           DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 weeks',
           DATE_TRUNC('week', CURRENT_DATE),
           INTERVAL '1 week'
         )::date AS week_start
       ),
       workout_totals AS (
         SELECT DATE_TRUNC('week', ws.start_time)::date AS week_start,
                COALESCE(SUM(wl.weight * wl.reps), 0)::numeric AS volume_kg,
                COALESCE(MAX(wl.weight), 0)::numeric AS max_weight_kg,
                COUNT(DISTINCT DATE(ws.start_time))::int AS workouts
         FROM workout_sessions ws
         LEFT JOIN workout_logs wl ON wl.session_id = ws.id
         WHERE ws.user_id = $1
           AND ws.end_time IS NOT NULL
           AND ws.success = 1
           AND ws.start_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 weeks'
         GROUP BY DATE_TRUNC('week', ws.start_time)::date
       )
       SELECT weeks.week_start::text, COALESCE(workout_totals.volume_kg, 0)::text AS volume_kg,
              COALESCE(workout_totals.max_weight_kg, 0)::text AS max_weight_kg,
              COALESCE(workout_totals.workouts, 0)::int AS workouts
       FROM weeks
       LEFT JOIN workout_totals ON workout_totals.week_start = weeks.week_start
       ORDER BY weeks.week_start`,
      [userId]
    );
    const { rows: goalRows } = await query<{ weekly_training_goal: number }>(
      'SELECT weekly_training_goal FROM users WHERE id = $1',
      [userId]
    );
    const weeklyGoal = goalRows[0]?.weekly_training_goal ?? 5;
    const currentWeek = weeklyRows.at(-1);

    res.json({
      weekly_goal: weeklyGoal,
      workouts_this_week: currentWeek?.workouts ?? 0,
      goal_completion_percent: Math.min(
        100,
        Math.round(((currentWeek?.workouts ?? 0) / Math.max(weeklyGoal, 1)) * 100)
      ),
      weeks: weeklyRows.map((row) => ({
        week_start: row.week_start,
        volume_kg: Math.round(Number(row.volume_kg)),
        max_weight_kg: Math.round(Number(row.max_weight_kg)),
        workouts: row.workouts,
      })),
    });
  })
);

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

    const successfulToday = await query<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE user_id = $1 AND routine_id = $2
         AND end_time IS NOT NULL AND success = 1
         AND ${sqlTodayRange('start_time')}
       LIMIT 1`,
      [targetUserId, routine_id]
    );

    if (successfulToday.rows[0]) {
      await query(
        `UPDATE workout_sessions
         SET end_time = NOW(), success = 0
         WHERE user_id = $1 AND routine_id = $2 AND end_time IS NULL`,
        [targetUserId, routine_id]
      );
      res.status(409).json({
        error: 'Ya completaste esta rutina hoy',
        code: 'ROUTINE_COMPLETED_TODAY',
      });
      return;
    }

    await query(
      `UPDATE workout_sessions
       SET end_time = NOW(), success = 0
       WHERE user_id = $1 AND routine_id = $2
         AND end_time IS NULL
         AND start_time < NOW() - INTERVAL '12 hours'`,
      [targetUserId, routine_id]
    );

    const existing = await query<{ id: number; start_time: string }>(
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

    try {
      const insert = await query<{ id: number; start_time: string }>(
        `INSERT INTO workout_sessions (user_id, routine_id, success)
         VALUES ($1, $2, 0)
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
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        const raced = await query<{ id: number; start_time: string }>(
          `SELECT id, start_time FROM workout_sessions
           WHERE user_id = $1 AND routine_id = $2 AND end_time IS NULL
           ORDER BY start_time DESC LIMIT 1`,
          [targetUserId, routine_id]
        );
        if (raced.rows[0]) {
          const session = raced.rows[0];
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
      }
      throw err;
    }
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

    const openSession = await query<{ id: number }>(
      `SELECT id FROM workout_sessions WHERE id = $1 AND end_time IS NULL`,
      [session_id]
    );
    if (!openSession.rows[0]) {
      res.status(409).json({ error: 'La sesión ya finalizó' });
      return;
    }

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

    const { rowCount } = await query(
      `UPDATE workout_sessions
       SET end_time = NOW(), success = $1
       WHERE id = $2 AND end_time IS NULL`,
      [success ? 1 : 0, session_id]
    );
    if (rowCount === 0) {
      res.status(409).json({ error: 'La sesión ya finalizó' });
      return;
    }
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
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ error: 'ID de sesión inválido' });
      return;
    }

    const { success } = req.body;

    if (typeof success !== 'boolean') {
      res.status(400).json({ error: 'success debe ser un booleano' });
      return;
    }

    const { rows } = await query<{ end_time: string | null }>(
      'SELECT end_time FROM workout_sessions WHERE id = $1',
      [sessionId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Sesión no encontrada' });
      return;
    }

    if (rows[0].end_time !== null) {
      res.status(409).json({ error: 'La sesión ya finalizó' });
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
