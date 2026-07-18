import { asyncRouter } from './middleware/asyncRouter.ts';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { logger } from '../lib/logger.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import {
  routineCreateSchema,
  routineExerciseSchema,
  routineUpdateSchema,
} from '../lib/routineSchemas.ts';
import { parseBooleanQuery, parsePaginationQuery } from '../lib/pagination.ts';

const router = asyncRouter();

const ROUTINES_ALL_MAX = 200;

interface AssignmentRow {
  user_id: number;
  full_name: string;
  profile_image: string | null;
  routine_id: number;
  routine_name: string;
  difficulty: string;
  assigned_at: string;
  start_date: string | null;
  end_date: string | null;
  exercise_count: number;
}

interface AssignmentRoutine {
  routine_id: number;
  routine_name: string;
  difficulty: string;
  assigned_at: string;
  start_date: string | null;
  end_date: string | null;
  exercise_count: number;
}

interface GroupedAssignment {
  id: number;
  full_name: string;
  profile_image: string | null;
  routines: AssignmentRoutine[];
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

function isMissingColumnError(err: unknown, column: string): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  const columnName = column.toLowerCase();
  return (
    msg.includes(columnName) && (msg.includes('does not exist') || msg.includes('undefined_column'))
  );
}

const ROUTINE_EXERCISES_SELECT_WITH_PRESCRIPTION = `SELECT e.*, re.sets, re.reps, re.rest_seconds, re.weight_suggestion, re.set_prescription,
              re.id as routine_exercise_id
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = $1`;

const ROUTINE_EXERCISES_SELECT_LEGACY = `SELECT e.*, re.sets, re.reps, re.rest_seconds, re.weight_suggestion,
              re.id as routine_exercise_id
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = $1`;

async function fetchRoutineExercisesRows(routineId: string | number) {
  try {
    return await query(ROUTINE_EXERCISES_SELECT_WITH_PRESCRIPTION, [routineId]);
  } catch (err) {
    if (isMissingColumnError(err, 'set_prescription')) {
      return await query(ROUTINE_EXERCISES_SELECT_LEGACY, [routineId]);
    }
    throw err;
  }
}

const ROUTINE_EXERCISE_PREVIEW_SQL = `LEFT JOIN LATERAL (
       SELECT string_agg(preview_names.name, ' · ') AS exercise_preview
       FROM (
         SELECT e.name
         FROM routine_exercises re
         JOIN exercises e ON e.id = re.exercise_id
         WHERE re.routine_id = r.id
         ORDER BY re.id
         LIMIT 3
       ) preview_names
     ) preview ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS exercise_count
       FROM routine_exercises
       WHERE routine_id = r.id
     ) counts ON true`;

async function getRoutineTrainerId(routineId: string | number): Promise<number | null> {
  const { rows } = await query<{ trainer_id: number }>(
    'SELECT trainer_id FROM routines WHERE id = $1',
    [routineId]
  );
  return rows[0]?.trainer_id ?? null;
}

function assertTrainerOwnsRoutine(req: AuthRequest, trainerId: number | null): boolean {
  if (req.user!.role === 'admin') return true;
  if (req.user!.role === 'trainer' && trainerId === req.user!.id) return true;
  return false;
}

async function assertMemberAssigned(userId: number, routineId: string | number): Promise<boolean> {
  const { rows } = await query(
    'SELECT id FROM user_routines WHERE user_id = $1 AND routine_id = $2',
    [userId, routineId]
  );
  return rows.length > 0;
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (user.role === 'trainer') {
      where = ' WHERE r.trainer_id = $1';
      params.push(user.id);
    } else if (user.role === 'member') {
      where = ` WHERE r.id IN (
        SELECT routine_id FROM user_routines WHERE user_id = $1
      )`;
      params.push(user.id);
    }

    const selectSql = `SELECT r.*, u.full_name as trainer_name, tp.shift as trainer_shift,
      COALESCE(counts.exercise_count, 0) AS exercise_count,
      preview.exercise_preview
      FROM routines r
      JOIN users u ON r.trainer_id = u.id
      LEFT JOIN trainer_profiles tp ON tp.user_id = r.trainer_id
      ${ROUTINE_EXERCISE_PREVIEW_SQL}
      ${where}
      ORDER BY r.name ASC`;

    const wantAll = parseBooleanQuery(req.query.all);
    if (wantAll) {
      const listParams = [...params, ROUTINES_ALL_MAX];
      const { rows } = await query(`${selectSql} LIMIT $${listParams.length}`, listParams);
      res.json(rows);
      return;
    }

    const { page, pageSize, offset } = parsePaginationQuery(req.query, {
      pageSize: 50,
      maxPageSize: 100,
    });
    const countParams = [...params];
    const listParams = [...params, pageSize, offset];
    const [countResult, listResult] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM routines r
         ${where}`,
        countParams
      ),
      query(
        `${selectSql} LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams
      ),
    ]);

    res.json({
      items: listResult.rows,
      total: parseInt(countResult.rows[0]?.count || '0', 10),
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/assignments/all', authorize(['trainer']), async (req: AuthRequest, res) => {
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;

  try {
    const params: unknown[] = [];
    let trainerFilter = '';
    if (trainerId) {
      trainerFilter = ' AND r.trainer_id = $1';
      params.push(trainerId);
    }

    const { rows } = await query<AssignmentRow>(
      `SELECT
        u.id as user_id,
        u.full_name,
        u.profile_image,
        r.id as routine_id,
        r.name as routine_name,
        r.difficulty,
        ur.assigned_at,
        ur.start_date,
        ur.end_date,
        COALESCE(counts.exercise_count, 0) as exercise_count
      FROM user_routines ur
      JOIN users u ON ur.user_id = u.id
      JOIN routines r ON ur.routine_id = r.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS exercise_count
        FROM routine_exercises
        WHERE routine_id = r.id
      ) counts ON true
      WHERE 1=1${trainerFilter}
      ORDER BY u.full_name ASC, ur.assigned_at DESC`,
      params
    );

    const grouped = rows.reduce<Record<number, GroupedAssignment>>((acc, curr) => {
      const { user_id, full_name, profile_image, ...routine } = curr;
      if (!acc[user_id]) {
        acc[user_id] = {
          id: user_id,
          full_name,
          profile_image,
          routines: [],
        };
      }
      acc[user_id].routines.push(routine);
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const routineResult = await query('SELECT * FROM routines WHERE id = $1', [req.params.id]);
    const routine = routineResult.rows[0];

    if (!routine) return res.status(404).json({ error: 'Routine not found' });

    if (req.user!.role === 'member') {
      const assigned = await assertMemberAssigned(req.user!.id, req.params.id);
      if (!assigned) {
        return res.status(403).json({ error: 'Rutina no asignada' });
      }
    } else if (req.user!.role === 'trainer') {
      const trainerId = await getRoutineTrainerId(req.params.id);
      if (!assertTrainerOwnsRoutine(req, trainerId)) {
        return res.status(403).json({ error: 'No tienes permiso para ver esta rutina' });
      }
    }

    const exercisesResult = await fetchRoutineExercisesRows(req.params.id);

    res.json({ ...routine, exercises: exercisesResult.rows });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/', authorize(['trainer']), async (req: AuthRequest, res) => {
  const parsed = routineCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { name, difficulty } = parsed.data;
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : parsed.data.trainer_id;

  if (!trainerId) {
    return res.status(400).json({ error: 'trainer_id es obligatorio' });
  }

  try {
    const trainerCheck = await query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1 AND role = 'trainer'`,
      [trainerId]
    );
    if (!trainerCheck.rows[0]) {
      return res.status(400).json({ error: 'Entrenador inválido' });
    }

    const { rows } = await query(
      'INSERT INTO routines (name, difficulty, trainer_id) VALUES ($1, $2, $3) RETURNING id',
      [name, difficulty, trainerId]
    );
    res.json({ id: rows[0].id, success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.put('/:id', authorize(['trainer']), async (req: AuthRequest, res) => {
  const parsed = routineUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { name, difficulty } = parsed.data;
  const trainerId = await getRoutineTrainerId(req.params.id);
  if (trainerId === null) return res.status(404).json({ error: 'Rutina no encontrada' });
  if (!assertTrainerOwnsRoutine(req, trainerId)) {
    return res.status(403).json({ error: 'No tienes permiso para editar esta rutina' });
  }
  try {
    await query('UPDATE routines SET name = $1, difficulty = $2 WHERE id = $3', [
      name,
      difficulty,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.delete('/:id', authorize(['trainer']), async (req: AuthRequest, res) => {
  const routineId = parseInt(req.params.id, 10);
  if (isNaN(routineId)) return res.status(400).json({ error: 'ID de rutina inválido' });

  const trainerId = await getRoutineTrainerId(routineId);
  if (trainerId === null) return res.status(404).json({ error: 'Rutina no encontrada' });
  if (!assertTrainerOwnsRoutine(req, trainerId)) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar esta rutina' });
  }

  try {
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `DELETE FROM workout_logs
         WHERE session_id IN (SELECT id FROM workout_sessions WHERE routine_id = $1)`,
        [routineId]
      );
      await client.query('DELETE FROM workout_sessions WHERE routine_id = $1', [routineId]);
      await client.query('DELETE FROM routine_exercises WHERE routine_id = $1', [routineId]);
      await client.query('DELETE FROM user_routines WHERE routine_id = $1', [routineId]);

      const result = await client.query('DELETE FROM routines WHERE id = $1', [routineId]);
      if (result.rowCount === 0) {
        throw new Error('La rutina no existe o ya fue eliminada');
      }
    });

    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Delete routine error', { error: getErrorMessage(err) });
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/:id/exercises', authorize(['trainer']), async (req: AuthRequest, res) => {
  const parsed = routineExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription } =
    parsed.data;
  const routineId = req.params.id;

  const trainerId = await getRoutineTrainerId(routineId);
  if (trainerId === null) return res.status(404).json({ error: 'Rutina no encontrada' });
  if (!assertTrainerOwnsRoutine(req, trainerId)) {
    return res.status(403).json({ error: 'No tienes permiso para modificar esta rutina' });
  }

  try {
    const prescriptionJson = set_prescription ? JSON.stringify(set_prescription) : null;
    let rows: { id: number }[];

    try {
      ({ rows } = await query<{ id: number }>(
        `INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [routineId, exercise_id, sets, reps, rest_seconds, weight_suggestion, prescriptionJson]
      ));
    } catch (err) {
      if (!isMissingColumnError(err, 'set_prescription')) throw err;
      ({ rows } = await query<{ id: number }>(
        `INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [routineId, exercise_id, sets, reps, rest_seconds, weight_suggestion]
      ));
    }

    res.json({ id: rows[0].id, success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.put(
  '/:id/exercises/:routineExerciseId',
  authorize(['trainer']),
  async (req: AuthRequest, res) => {
    const parsed = routineExerciseSchema.omit({ exercise_id: true }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { sets, reps, rest_seconds, weight_suggestion, set_prescription } = parsed.data;
    const trainerId = await getRoutineTrainerId(req.params.id);
    if (trainerId === null) return res.status(404).json({ error: 'Rutina no encontrada' });
    if (!assertTrainerOwnsRoutine(req, trainerId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta rutina' });
    }
    try {
      const prescriptionJson = set_prescription ? JSON.stringify(set_prescription) : null;
      try {
        await query(
          `UPDATE routine_exercises
         SET sets = $1, reps = $2, rest_seconds = $3, weight_suggestion = $4, set_prescription = $5
         WHERE id = $6 AND routine_id = $7`,
          [
            sets,
            reps,
            rest_seconds,
            weight_suggestion,
            prescriptionJson,
            req.params.routineExerciseId,
            req.params.id,
          ]
        );
      } catch (err) {
        if (!isMissingColumnError(err, 'set_prescription')) throw err;
        await query(
          `UPDATE routine_exercises
         SET sets = $1, reps = $2, rest_seconds = $3, weight_suggestion = $4
         WHERE id = $5 AND routine_id = $6`,
          [sets, reps, rest_seconds, weight_suggestion, req.params.routineExerciseId, req.params.id]
        );
      }
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  }
);

router.delete(
  '/:id/exercises/:routineExerciseId',
  authorize(['trainer']),
  async (req: AuthRequest, res) => {
    const trainerId = await getRoutineTrainerId(req.params.id);
    if (trainerId === null) return res.status(404).json({ error: 'Rutina no encontrada' });
    if (!assertTrainerOwnsRoutine(req, trainerId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta rutina' });
    }
    try {
      await query('DELETE FROM routine_exercises WHERE id = $1 AND routine_id = $2', [
        req.params.routineExerciseId,
        req.params.id,
      ]);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  }
);

export default router;
