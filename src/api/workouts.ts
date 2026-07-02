import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest } from './middleware/auth.ts';
import { requireWorkoutSessionAccess } from './middleware/access.ts';
import { trainerHasMemberRoutineAccess } from '../lib/trainerAccess.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { startWorkoutSchema, logWorkoutSchema, finishWorkoutSchema, cancelWorkoutSchema } from './workoutSchemas.ts';

const router = asyncRouter();

router.post('/start', asyncHandler(async (req: AuthRequest, res) => {
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
}));

router.post('/log', requireWorkoutSessionAccess, asyncHandler(async (req, res) => {
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
}));

router.post('/finish', requireWorkoutSessionAccess, asyncHandler(async (req, res) => {
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
}));

router.post('/cancel', requireWorkoutSessionAccess, asyncHandler(async (req, res) => {
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
}));

router.patch('/sessions/:sessionId/success', requireWorkoutSessionAccess, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { success } = req.body;

  if (typeof success !== 'boolean') {
    res.status(400).json({ error: 'success debe ser un booleano' });
    return;
  }

  await query(`UPDATE workout_sessions SET success = $1 WHERE id = $2`, [success, sessionId]);
  res.json({ success: true });
}));

export default router;
