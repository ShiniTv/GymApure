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
import { isBetterSet, pickBestSet } from '../lib/exerciseRecords.ts';

const router = asyncRouter();

router.get(
  '/active',
  authorize(['member']),
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { rows } = await query<{
      id: number;
      routine_id: number;
      routine_name: string;
      start_time: string;
      sets_completed: number;
    }>(
      `SELECT ws.id, ws.routine_id, r.name AS routine_name, ws.start_time,
              COALESCE(wl.sets_completed, 0)::int AS sets_completed
       FROM workout_sessions ws
       JOIN routines r ON ws.routine_id = r.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS sets_completed
         FROM workout_logs wl
         WHERE wl.session_id = ws.id
       ) wl ON true
       WHERE ws.user_id = $1 AND ws.end_time IS NULL
       ORDER BY ws.start_time DESC`,
      [userId]
    );
    res.json(rows);
  })
);

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
      // Drop orphan in-progress sessions — do not write them as failed history.
      await query(
        `DELETE FROM workout_sessions
         WHERE user_id = $1 AND routine_id = $2 AND end_time IS NULL`,
        [targetUserId, routine_id]
      );
      res.status(409).json({
        error: 'Ya completaste esta rutina hoy',
        code: 'ROUTINE_COMPLETED_TODAY',
      });
      return;
    }

    // Very old open sessions: discard instead of marking failed in history.
    await query(
      `DELETE FROM workout_sessions
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

    const sessionResult = await query<{ user_id: number; routine_id: number }>(
      `SELECT user_id, routine_id FROM workout_sessions WHERE id = $1 AND end_time IS NULL`,
      [session_id]
    );
    const session = sessionResult.rows[0];
    if (!session) {
      res.status(409).json({ error: 'La sesión ya finalizó' });
      return;
    }

    await query(
      `UPDATE workout_sessions
       SET end_time = NOW(), success = $1
       WHERE id = $2 AND end_time IS NULL`,
      [success ? 1 : 0, session_id]
    );

    if (success) {
      // Discard sibling open sessions (no failed history rows).
      await query(
        `DELETE FROM workout_sessions
         WHERE user_id = $1 AND routine_id = $2
           AND end_time IS NULL AND id != $3`,
        [session.user_id, session.routine_id, session_id]
      );
    }

    res.json({ success: true });
  })
);

router.post(
  '/discard',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    const parsed = cancelWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { session_id } = parsed.data;

    const { rowCount } = await query(
      `DELETE FROM workout_sessions WHERE id = $1 AND end_time IS NULL`,
      [session_id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
      return;
    }
    res.json({ success: true });
  })
);

router.post(
  '/cancel',
  requireWorkoutSessionAccess,
  asyncHandler(async (req, res) => {
    // Alias of discard: abandoning mid-workout must not create a failed history row.
    const parsed = cancelWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { session_id } = parsed.data;

    const { rowCount } = await query(
      `DELETE FROM workout_sessions WHERE id = $1 AND end_time IS NULL`,
      [session_id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
      return;
    }
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

    if (rows[0].end_time === null) {
      res.status(409).json({
        error:
          'No puedes cambiar el éxito de una sesión en curso. Finaliza el entrenamiento primero.',
      });
      return;
    }

    await query(`UPDATE workout_sessions SET success = $1 WHERE id = $2`, [
      success ? 1 : 0,
      sessionId,
    ]);
    res.json({ success: true });
  })
);

function toIsoTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    return value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toYmd(value: unknown): string {
  const iso = toIsoTimestamp(value);
  return iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

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
      start_time: string | Date;
      end_time: string | Date | null;
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

    const startTimeIso = toIsoTimestamp(session.start_time) ?? new Date().toISOString();
    const endTimeIso = toIsoTimestamp(session.end_time);

    const [plannedResult, logsResult, priorBestResult] = await Promise.all([
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
      query<{
        exercise_id: number;
        weight: number;
        reps: number;
      }>(
        `SELECT DISTINCT ON (wl.exercise_id)
                wl.exercise_id, wl.weight::float8 AS weight, wl.reps::int AS reps
         FROM workout_logs wl
         JOIN workout_sessions ws ON ws.id = wl.session_id
         WHERE ws.user_id = $1
           AND ws.id <> $2
           AND ws.end_time IS NOT NULL
           AND ws.success = 1
           AND ws.start_time < $3::timestamptz
           AND wl.weight IS NOT NULL
           AND wl.reps IS NOT NULL
           AND wl.reps > 0
         ORDER BY wl.exercise_id, wl.weight DESC, wl.reps DESC`,
        [session.user_id, sessionId, startTimeIso]
      ),
    ]);

    const priorBestByExercise = new Map<number, { weight: number; reps: number }>();
    for (const row of priorBestResult.rows) {
      priorBestByExercise.set(Number(row.exercise_id), {
        weight: Number(row.weight),
        reps: Number(row.reps),
      });
    }

    // Also consider manual RM tests dated before this session.
    try {
      const sessionDate = toYmd(session.start_time);
      const { rows: manualPrior } = await query<{
        exercise_id: number;
        weight: number;
        reps: number;
      }>(
        `SELECT DISTINCT ON (exercise_id)
                exercise_id, weight::float8 AS weight, reps::int AS reps
         FROM exercise_rm_tests
         WHERE user_id = $1 AND test_date < $2
         ORDER BY exercise_id, weight DESC, reps DESC`,
        [session.user_id, sessionDate]
      );
      for (const row of manualPrior) {
        const exerciseId = Number(row.exercise_id);
        const candidate = { weight: Number(row.weight), reps: Number(row.reps) };
        const existing = priorBestByExercise.get(exerciseId);
        if (isBetterSet(candidate, existing)) {
          priorBestByExercise.set(exerciseId, candidate);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/exercise_rm_tests|does not exist|undefined_table/i.test(message)) {
        throw err;
      }
    }

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

    const mapExercise = (
      exerciseId: number,
      name: string,
      muscleGroup: string,
      plannedSets: number,
      plannedReps: number,
      logs: { set_number: number; weight: number; reps: number }[]
    ) => {
      setsLogged += logs.length;
      setsPlanned += plannedSets;
      for (const log of logs) {
        totalVolumeKg += log.weight * log.reps;
      }
      const sessionBest = pickBestSet(logs);
      const priorBest = priorBestByExercise.get(exerciseId) ?? null;
      const isAllTimePr = sessionBest != null && isBetterSet(sessionBest, priorBest);
      return {
        exercise_id: exerciseId,
        name,
        muscle_group: muscleGroup,
        planned_sets: plannedSets,
        planned_reps: plannedReps,
        logs,
        session_best: sessionBest,
        is_all_time_pr: isAllTimePr,
      };
    };

    const exercises = plannedResult.rows.map((row) => {
      const logs = logsByExercise.get(row.exercise_id) ?? [];
      logsByExercise.delete(row.exercise_id);
      return mapExercise(
        row.exercise_id,
        row.name,
        row.muscle_group,
        row.planned_sets,
        row.planned_reps,
        logs
      );
    });

    for (const [exerciseId, logs] of logsByExercise) {
      exercises.push(mapExercise(exerciseId, 'Ejercicio', '', 0, 0, logs));
    }

    res.json({
      id: session.id,
      routine_id: session.routine_id,
      routine_name: session.routine_name,
      start_time: startTimeIso,
      end_time: endTimeIso,
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
