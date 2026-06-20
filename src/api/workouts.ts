import { Router } from 'express';
import { query } from '../db/index.ts';
import { AuthRequest } from './middleware/auth.ts';
import { requireWorkoutSessionAccess } from './middleware/access.ts';

const router = Router();

router.post('/start', async (req: AuthRequest, res) => {
  const { user_id, routine_id } = req.body;
  const user = req.user!;

  const targetUserId = parseInt(String(user_id), 10);
  if (Number.isNaN(targetUserId)) {
    return res.status(400).json({ error: 'user_id inválido' });
  }

  if (user.role === 'member' && user.id !== targetUserId) {
    return res.status(403).json({ error: 'No tienes permiso para iniciar este entrenamiento' });
  }

  try {
    if (user.role === 'member') {
      const assigned = await query(
        'SELECT id FROM user_routines WHERE user_id = $1 AND routine_id = $2',
        [targetUserId, routine_id]
      );
      if (!assigned.rows[0]) {
        return res.status(403).json({ error: 'Rutina no asignada' });
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
      return res.json({
        id: session.id,
        start_time: session.start_time,
        status: 'resumed',
        logs: logs.rows,
      });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/log', requireWorkoutSessionAccess, async (req, res) => {
  const { session_id, exercise_id, set_number, weight, reps } = req.body;

  try {
    const { rows } = await query(
      `INSERT INTO workout_logs (session_id, exercise_id, set_number, weight, reps)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id, exercise_id, set_number)
       DO UPDATE SET weight = EXCLUDED.weight, reps = EXCLUDED.reps
       RETURNING id`,
      [session_id, exercise_id, set_number, weight, reps]
    );
    res.json({ id: rows[0].id, success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/finish', requireWorkoutSessionAccess, async (req, res) => {
  const { session_id, success } = req.body;

  try {
    await query(
      `UPDATE workout_sessions
       SET end_time = NOW(), success = $1
       WHERE id = $2`,
      [success ? 1 : 0, session_id]
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

/** Abandon an in-progress session so the member can start fresh. */
router.post('/cancel', requireWorkoutSessionAccess, async (req, res) => {
  const { session_id } = req.body;

  try {
    const { rowCount } = await query(
      `UPDATE workout_sessions
       SET end_time = NOW(), success = 0
       WHERE id = $1 AND end_time IS NULL`,
      [session_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
    }
    await query('DELETE FROM workout_logs WHERE session_id = $1', [session_id]);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.patch('/sessions/:sessionId/success', requireWorkoutSessionAccess, async (req, res) => {
  const { sessionId } = req.params;
  const { success } = req.body;

  try {
    await query(`UPDATE workout_sessions SET success = $1 WHERE id = $2`, [success, sessionId]);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
