import { asyncRouter } from './middleware/asyncRouter.ts';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { logger } from '../lib/logger.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import {
  routineCreateSchema,
  routineExerciseOrderSchema,
  routineExerciseSchema,
  routineUpdateSchema,
} from '../lib/routineSchemas.ts';
import { parseBooleanQuery, parsePaginationQuery } from '../lib/pagination.ts';
import {
  createMemberOwnedRoutine,
  listSelectableTemplates,
  recordMemberActivityEvent,
  selfAssignTemplateRoutine,
} from '../lib/memberAgency.ts';
import {
  notifyMemberCreatedRoutine,
  notifyMemberExerciseSubstituted,
  notifyMemberSelfAssignedTemplate,
} from '../lib/chat/eventMessages.ts';

const router = asyncRouter();

const ROUTINES_ALL_MAX = 200;
const cloneRoutineSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});
const substituteExerciseSchema = z.object({
  exercise_id: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2, 'Indica el motivo').max(500),
});

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

const ROUTINE_EXERCISES_ORDER_SQL = ' ORDER BY re.sort_order ASC, re.id ASC';
const ROUTINE_EXERCISES_ORDER_LEGACY_SQL = ' ORDER BY re.id ASC';

const ROUTINE_EXERCISES_SELECT_WITH_PRESCRIPTION = `SELECT e.*, re.sets, re.reps, re.rest_seconds, re.weight_suggestion, re.set_prescription,
              re.sort_order, re.id as routine_exercise_id
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = $1${ROUTINE_EXERCISES_ORDER_SQL}`;

const ROUTINE_EXERCISES_SELECT_LEGACY = `SELECT e.*, re.sets, re.reps, re.rest_seconds, re.weight_suggestion,
              re.id as routine_exercise_id
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = $1${ROUTINE_EXERCISES_ORDER_LEGACY_SQL}`;

const ROUTINE_EXERCISES_SELECT_WITH_PRESCRIPTION_NO_SORT = `SELECT e.*, re.sets, re.reps, re.rest_seconds, re.weight_suggestion, re.set_prescription,
              re.id as routine_exercise_id
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = $1${ROUTINE_EXERCISES_ORDER_LEGACY_SQL}`;

async function fetchRoutineExercisesRows(routineId: string | number) {
  try {
    return await query(ROUTINE_EXERCISES_SELECT_WITH_PRESCRIPTION, [routineId]);
  } catch (err) {
    if (isMissingColumnError(err, 'sort_order')) {
      try {
        return await query(ROUTINE_EXERCISES_SELECT_WITH_PRESCRIPTION_NO_SORT, [routineId]);
      } catch (inner) {
        if (isMissingColumnError(inner, 'set_prescription')) {
          return await query(ROUTINE_EXERCISES_SELECT_LEGACY, [routineId]);
        }
        throw inner;
      }
    }
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
         ORDER BY re.sort_order ASC, re.id ASC
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

async function getRoutineOwnership(routineId: string | number): Promise<{
  trainer_id: number;
  owner_member_id: number | null;
} | null> {
  try {
    const { rows } = await query<{ trainer_id: number; owner_member_id: number | null }>(
      'SELECT trainer_id, owner_member_id FROM routines WHERE id = $1',
      [routineId]
    );
    return rows[0] ?? null;
  } catch (err) {
    if (isMissingColumnError(err, 'owner_member_id')) {
      const trainerId = await getRoutineTrainerId(routineId);
      if (trainerId == null) return null;
      return { trainer_id: trainerId, owner_member_id: null };
    }
    throw err;
  }
}

function assertTrainerOwnsRoutine(req: AuthRequest, trainerId: number | null): boolean {
  if (req.user!.role === 'admin') return true;
  if (req.user!.role === 'trainer' && trainerId === req.user!.id) return true;
  return false;
}

/** Full mutate (name, exercises, delete): staff owns trainer library; member owns only self-created. */
function assertCanMutateRoutine(
  req: AuthRequest,
  ownership: { trainer_id: number; owner_member_id: number | null } | null
): boolean {
  if (!ownership) return false;
  if (req.user!.role === 'admin') return true;
  if (req.user!.role === 'member') {
    return ownership.owner_member_id === req.user!.id;
  }
  return assertTrainerOwnsRoutine(req, ownership.trainer_id);
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

router.get('/assignments/all', authorize(['trainer', 'admin']), async (req: AuthRequest, res) => {
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

async function assertCanModifyRoutineExercise(
  req: AuthRequest,
  routineId: number
): Promise<{ ok: true; trainerId: number } | { ok: false; status: number; error: string }> {
  const trainerId = await getRoutineTrainerId(routineId);
  if (trainerId === null) {
    return { ok: false, status: 404, error: 'Rutina no encontrada' };
  }

  if (req.user!.role === 'member') {
    const assigned = await assertMemberAssigned(req.user!.id, routineId);
    if (!assigned) {
      return { ok: false, status: 403, error: 'Rutina no asignada' };
    }
    return { ok: true, trainerId };
  }

  if (!assertTrainerOwnsRoutine(req, trainerId)) {
    return { ok: false, status: 403, error: 'No tienes permiso para modificar esta rutina' };
  }
  return { ok: true, trainerId };
}

async function performExerciseSubstitution(
  req: AuthRequest,
  routineId: number,
  routineExerciseId: number,
  exerciseId: number,
  reason: string
) {
  const access = await assertCanModifyRoutineExercise(req, routineId);
  if (!access.ok) {
    return { status: access.status, body: { error: access.error } };
  }

  const replacement = await withTransaction(async (client: PoolClient) => {
    const current = await client.query<{
      exercise_id: number;
      muscle_group: string;
      exercise_name: string;
    }>(
      `SELECT re.exercise_id, e.muscle_group, e.name AS exercise_name
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.id = $1 AND re.routine_id = $2`,
      [routineExerciseId, routineId]
    );
    const source = current.rows[0];
    if (!source) throw new Error('Ejercicio de rutina no encontrado');

    const target = await client.query<{ id: number; name: string; muscle_group: string }>(
      'SELECT id, name, muscle_group FROM exercises WHERE id = $1',
      [exerciseId]
    );
    const targetExercise = target.rows[0];
    if (!targetExercise) throw new Error('Ejercicio sustituto no encontrado');
    if (targetExercise.id === source.exercise_id) {
      throw new Error('Elige un ejercicio distinto');
    }
    if (targetExercise.muscle_group.toLowerCase() !== source.muscle_group.toLowerCase()) {
      throw new Error('El sustituto debe trabajar el mismo grupo muscular');
    }

    await client.query('UPDATE routine_exercises SET exercise_id = $1 WHERE id = $2', [
      targetExercise.id,
      routineExerciseId,
    ]);
    await client.query(
      `INSERT INTO routine_exercise_substitutions (
         routine_exercise_id, previous_exercise_id, replacement_exercise_id, substituted_by, reason
       ) VALUES ($1, $2, $3, $4, $5)`,
      [routineExerciseId, source.exercise_id, targetExercise.id, req.user!.id, reason]
    );

    if (req.user!.role === 'member') {
      await recordMemberActivityEvent({
        memberId: req.user!.id,
        trainerId: access.trainerId,
        eventType: 'exercise_substituted',
        routineId,
        metadata: {
          previous_exercise_id: source.exercise_id,
          previous_name: source.exercise_name,
          replacement_exercise_id: targetExercise.id,
          replacement_name: targetExercise.name,
          reason,
        },
      });
    }

    return {
      exercise: targetExercise,
      previousName: source.exercise_name,
    };
  });

  if (req.user!.role === 'member') {
    void notifyMemberExerciseSubstituted(
      req.user!.id,
      access.trainerId,
      routineId,
      replacement.previousName,
      replacement.exercise.name,
      reason
    ).catch((err) => {
      logger.error('Notify member substitute failed', { error: getErrorMessage(err) });
    });
  }

  return { status: 200, body: { success: true, exercise: replacement.exercise } };
}

router.get('/templates', authorize(['member']), async (req: AuthRequest, res) => {
  try {
    const rows = await listSelectableTemplates(req.user!.id);
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/:id/self-assign', authorize(['member']), async (req: AuthRequest, res) => {
  const templateId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    return res.status(400).json({ error: 'ID de plantilla inválido' });
  }

  try {
    const result = await selfAssignTemplateRoutine(req.user!.id, templateId);
    void notifyMemberSelfAssignedTemplate(
      req.user!.id,
      result.trainerId,
      result.routineName,
      result.templateName
    ).catch((err) => {
      logger.error('Notify self-assign failed', { error: getErrorMessage(err) });
    });
    res.status(201).json({
      success: true,
      routine_id: result.routineId,
      routine_name: result.routineName,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message.includes('no encontrada') ? 404 : 400;
    res.status(status).json({ error: message });
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

router.post('/', authorize(['trainer', 'admin', 'member']), async (req: AuthRequest, res) => {
  const parsed = routineCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { name, difficulty } = parsed.data;

  if (req.user!.role === 'member') {
    try {
      const created = await createMemberOwnedRoutine({
        memberId: req.user!.id,
        name,
        difficulty,
      });
      void notifyMemberCreatedRoutine(req.user!.id, created.trainerId, created.name);
      return res.status(201).json({ id: created.id, success: true });
    } catch (err: unknown) {
      return res.status(400).json({ error: getErrorMessage(err) });
    }
  }

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
      `INSERT INTO routines (name, difficulty, trainer_id, source)
       VALUES ($1, $2, $3, 'trainer') RETURNING id`,
      [name, difficulty, trainerId]
    );
    res.status(201).json({ id: rows[0].id, success: true });
  } catch (err: unknown) {
    if (isMissingColumnError(err, 'source')) {
      try {
        const { rows } = await query(
          'INSERT INTO routines (name, difficulty, trainer_id) VALUES ($1, $2, $3) RETURNING id',
          [name, difficulty, trainerId]
        );
        return res.status(201).json({ id: rows[0].id, success: true });
      } catch (inner: unknown) {
        return res.status(500).json({ error: getErrorMessage(inner) });
      }
    }
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/:id/clone', authorize(['trainer', 'admin']), async (req: AuthRequest, res) => {
  const sourceRoutineId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(sourceRoutineId) || sourceRoutineId <= 0) {
    return res.status(400).json({ error: 'ID de rutina inválido' });
  }
  const parsed = cloneRoutineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const trainerId = await getRoutineTrainerId(sourceRoutineId);
  if (trainerId === null) return res.status(404).json({ error: 'Rutina no encontrada' });
  if (!assertTrainerOwnsRoutine(req, trainerId)) {
    return res.status(403).json({ error: 'No tienes permiso para duplicar esta rutina' });
  }

  try {
    const routine = await withTransaction(async (client: PoolClient) => {
      const source = await client.query<{ name: string; difficulty: string }>(
        'SELECT name, difficulty FROM routines WHERE id = $1',
        [sourceRoutineId]
      );
      const sourceRoutine = source.rows[0];
      if (!sourceRoutine) throw new Error('Rutina no encontrada');

      const name = parsed.data.name ?? `${sourceRoutine.name} (copia)`;
      const created = await client.query<{ id: number; name: string; difficulty: string }>(
        `INSERT INTO routines (name, difficulty, trainer_id)
         VALUES ($1, $2, $3) RETURNING id, name, difficulty`,
        [name, sourceRoutine.difficulty, req.user!.role === 'trainer' ? req.user!.id : trainerId]
      );
      const routineId = created.rows[0].id;
      await client.query(
        `INSERT INTO routine_exercises (
           routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription, sort_order
         )
         SELECT $1, exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription, sort_order
         FROM routine_exercises WHERE routine_id = $2 ORDER BY sort_order ASC, id ASC`,
        [routineId, sourceRoutineId]
      );
      return created.rows[0];
    });
    res.status(201).json({ ...routine, success: true });
  } catch (err: unknown) {
    logger.error('Clone routine error', { error: getErrorMessage(err) });
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post(
  '/:id/exercises/:routineExerciseId/substitute',
  authorize(['trainer', 'admin', 'member']),
  async (req: AuthRequest, res) => {
    const routineId = parseInt(req.params.id, 10);
    const routineExerciseId = parseInt(req.params.routineExerciseId, 10);
    if (!Number.isSafeInteger(routineId) || !Number.isSafeInteger(routineExerciseId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const parsed = substituteExerciseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

    try {
      const result = await performExerciseSubstitution(
        req,
        routineId,
        routineExerciseId,
        parsed.data.exercise_id,
        parsed.data.reason
      );
      res.status(result.status).json(result.body);
    } catch (err: unknown) {
      res.status(400).json({ error: getErrorMessage(err) });
    }
  }
);

router.put('/:id', authorize(['trainer', 'admin', 'member']), async (req: AuthRequest, res) => {
  const parsed = routineUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { name, difficulty, member_selectable } = parsed.data;
  const ownership = await getRoutineOwnership(req.params.id);
  if (!ownership) return res.status(404).json({ error: 'Rutina no encontrada' });
  if (!assertCanMutateRoutine(req, ownership)) {
    return res.status(403).json({ error: 'No tienes permiso para editar esta rutina' });
  }
  // Members cannot publish gym templates
  if (req.user!.role === 'member' && member_selectable === true) {
    return res.status(403).json({ error: 'No puedes marcar plantillas del gym' });
  }
  try {
    if (member_selectable === undefined || req.user!.role === 'member') {
      await query('UPDATE routines SET name = $1, difficulty = $2 WHERE id = $3', [
        name,
        difficulty,
        req.params.id,
      ]);
    } else {
      await query(
        'UPDATE routines SET name = $1, difficulty = $2, member_selectable = $3 WHERE id = $4',
        [name, difficulty, member_selectable, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.delete('/:id', authorize(['trainer', 'admin', 'member']), async (req: AuthRequest, res) => {
  const routineId = parseInt(req.params.id, 10);
  if (isNaN(routineId)) return res.status(400).json({ error: 'ID de rutina inválido' });

  const ownership = await getRoutineOwnership(routineId);
  if (!ownership) return res.status(404).json({ error: 'Rutina no encontrada' });
  if (!assertCanMutateRoutine(req, ownership)) {
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

router.post(
  '/:id/exercises',
  authorize(['trainer', 'admin', 'member']),
  async (req: AuthRequest, res) => {
    const parsed = routineExerciseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription } =
      parsed.data;
    const routineId = req.params.id;

    const ownership = await getRoutineOwnership(routineId);
    if (!ownership) return res.status(404).json({ error: 'Rutina no encontrada' });
    if (!assertCanMutateRoutine(req, ownership)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta rutina' });
    }

    try {
      const prescriptionJson = set_prescription ? JSON.stringify(set_prescription) : null;
      let rows: { id: number }[];

      try {
        ({ rows } = await query<{ id: number }>(
          `INSERT INTO routine_exercises (
           routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription, sort_order
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           COALESCE((SELECT MAX(sort_order) FROM routine_exercises WHERE routine_id = $1), 0) + 1
         )
         RETURNING id`,
          [routineId, exercise_id, sets, reps, rest_seconds, weight_suggestion, prescriptionJson]
        ));
      } catch (err) {
        if (!isMissingColumnError(err, 'set_prescription')) throw err;
        ({ rows } = await query<{ id: number }>(
          `INSERT INTO routine_exercises (
           routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion, sort_order
         )
         VALUES (
           $1, $2, $3, $4, $5, $6,
           COALESCE((SELECT MAX(sort_order) FROM routine_exercises WHERE routine_id = $1), 0) + 1
         )
         RETURNING id`,
          [routineId, exercise_id, sets, reps, rest_seconds, weight_suggestion]
        ));
      }

      res.json({ id: rows[0].id, success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  }
);

router.put(
  '/:id/exercises/order',
  authorize(['trainer', 'admin', 'member']),
  async (req: AuthRequest, res) => {
    const parsed = routineExerciseOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const ownership = await getRoutineOwnership(req.params.id);
    if (!ownership) return res.status(404).json({ error: 'Rutina no encontrada' });
    if (!assertCanMutateRoutine(req, ownership)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta rutina' });
    }

    const orderedIds = parsed.data.routine_exercise_ids;
    try {
      await withTransaction(async (client: PoolClient) => {
        const existing = await client.query<{ id: number }>(
          'SELECT id FROM routine_exercises WHERE routine_id = $1',
          [req.params.id]
        );
        const existingIds = existing.rows.map((row) => Number(row.id));
        if (existingIds.length !== orderedIds.length) {
          throw new Error('El orden debe incluir todos los ejercicios de la rutina');
        }
        const existingSet = new Set(existingIds);
        if (orderedIds.some((id) => !existingSet.has(id))) {
          throw new Error('Hay ejercicios que no pertenecen a esta rutina');
        }

        for (let index = 0; index < orderedIds.length; index += 1) {
          await client.query(
            'UPDATE routine_exercises SET sort_order = $1 WHERE id = $2 AND routine_id = $3',
            [index + 1, orderedIds[index], req.params.id]
          );
        }
      });
      res.json({ success: true });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      const status = message.includes('ejercicios') ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);

router.put(
  '/:id/exercises/:routineExerciseId',
  authorize(['trainer', 'admin', 'member']),
  async (req: AuthRequest, res) => {
    const parsed = routineExerciseSchema.omit({ exercise_id: true }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { sets, reps, rest_seconds, weight_suggestion, set_prescription } = parsed.data;
    const ownership = await getRoutineOwnership(req.params.id);
    if (!ownership) return res.status(404).json({ error: 'Rutina no encontrada' });
    if (!assertCanMutateRoutine(req, ownership)) {
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
  authorize(['trainer', 'admin', 'member']),
  async (req: AuthRequest, res) => {
    const ownership = await getRoutineOwnership(req.params.id);
    if (!ownership) return res.status(404).json({ error: 'Rutina no encontrada' });
    if (!assertCanMutateRoutine(req, ownership)) {
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
