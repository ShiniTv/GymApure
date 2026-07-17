import { z } from 'zod';
import type { Router } from 'express';
import { query } from '../db/index.ts';
import type { AuthRequest } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import {
  buildExerciseSummary,
  estimateOneRmEpley,
  mergeRepsAtWeight,
  type DatedLiftSet,
  type ExerciseRecordSummary,
  type RmTestRow,
  type SessionTimelinePoint,
} from '../lib/exerciseRecords.ts';

const rmTestSchema = z.object({
  weight: z.coerce.number().min(0, 'Peso inválido').max(1000),
  reps: z.coerce.number().int().min(1, 'Repeticiones inválidas').max(500),
  test_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

interface LogSetRow {
  exercise_id: number;
  name: string;
  muscle_group: string;
  weight: number;
  reps: number;
  performed_at: string;
  session_id: number;
}

interface ManualSetRow {
  exercise_id: number;
  name: string;
  muscle_group: string;
  weight: number;
  reps: number;
  test_date: string;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

async function fetchLogSets(userId: number, exerciseId?: number): Promise<LogSetRow[]> {
  const params: unknown[] = [userId];
  let exerciseFilter = '';
  if (exerciseId != null) {
    params.push(exerciseId);
    exerciseFilter = ` AND wl.exercise_id = $${params.length}`;
  }

  const { rows } = await query<LogSetRow>(
    `SELECT wl.exercise_id, e.name, e.muscle_group,
            wl.weight::float8 AS weight, wl.reps::int AS reps,
            ws.start_time::text AS performed_at, ws.id AS session_id
     FROM workout_logs wl
     JOIN workout_sessions ws ON ws.id = wl.session_id
     JOIN exercises e ON e.id = wl.exercise_id
     WHERE ws.user_id = $1
       AND ws.end_time IS NOT NULL
       AND ws.success = 1
       AND wl.weight IS NOT NULL
       AND wl.reps IS NOT NULL
       AND wl.reps > 0
       ${exerciseFilter}
     ORDER BY wl.exercise_id, ws.start_time`,
    params
  );
  return rows.map((row) => ({
    ...row,
    weight: Number(row.weight),
    reps: Number(row.reps),
    session_id: Number(row.session_id),
    exercise_id: Number(row.exercise_id),
  }));
}

async function fetchManualSets(userId: number, exerciseId?: number): Promise<ManualSetRow[]> {
  const params: unknown[] = [userId];
  let exerciseFilter = '';
  if (exerciseId != null) {
    params.push(exerciseId);
    exerciseFilter = ` AND t.exercise_id = $${params.length}`;
  }

  try {
    const { rows } = await query<ManualSetRow>(
      `SELECT t.exercise_id, e.name, e.muscle_group,
              t.weight::float8 AS weight, t.reps::int AS reps,
              t.test_date::text AS test_date
       FROM exercise_rm_tests t
       JOIN exercises e ON e.id = t.exercise_id
       WHERE t.user_id = $1
         ${exerciseFilter}
       ORDER BY t.exercise_id, t.test_date`,
      params
    );
    return rows.map((row) => ({
      ...row,
      weight: Number(row.weight),
      reps: Number(row.reps),
      exercise_id: Number(row.exercise_id),
      test_date: dateOnly(row.test_date),
    }));
  } catch (err: unknown) {
    // Table may not exist yet before migration is applied.
    const message = err instanceof Error ? err.message : String(err);
    if (/exercise_rm_tests|does not exist|undefined_table/i.test(message)) {
      return [];
    }
    throw err;
  }
}

function summarizeFromRows(
  logSets: LogSetRow[],
  manualSets: ManualSetRow[]
): ExerciseRecordSummary[] {
  const byExercise = new Map<
    number,
    {
      name: string;
      muscle_group: string;
      dated: DatedLiftSet[];
      sessionIds: Set<number>;
    }
  >();

  for (const row of logSets) {
    let bucket = byExercise.get(row.exercise_id);
    if (!bucket) {
      bucket = {
        name: row.name,
        muscle_group: row.muscle_group,
        dated: [],
        sessionIds: new Set(),
      };
      byExercise.set(row.exercise_id, bucket);
    }
    bucket.sessionIds.add(row.session_id);
    bucket.dated.push({
      weight: row.weight,
      reps: row.reps,
      date: dateOnly(row.performed_at),
      session_id: row.session_id,
      source: 'log',
    });
  }

  for (const row of manualSets) {
    let bucket = byExercise.get(row.exercise_id);
    if (!bucket) {
      bucket = {
        name: row.name,
        muscle_group: row.muscle_group,
        dated: [],
        sessionIds: new Set(),
      };
      byExercise.set(row.exercise_id, bucket);
    }
    bucket.dated.push({
      weight: row.weight,
      reps: row.reps,
      date: row.test_date,
      session_id: null,
      source: 'manual',
    });
  }

  return [...byExercise.entries()]
    .map(([exerciseId, bucket]) =>
      buildExerciseSummary(
        exerciseId,
        bucket.name,
        bucket.muscle_group,
        bucket.dated,
        bucket.sessionIds.size
      )
    )
    .sort((a, b) => {
      const aDate = a.last_performed ?? '';
      const bDate = b.last_performed ?? '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return a.name.localeCompare(b.name, 'es');
    });
}

export function mountExerciseRecordRoutes(router: Router) {
  router.get(
    '/:id/exercise-records',
    requireMemberAccess('id'),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = parseInt(req.params.id, 10);
      if (Number.isNaN(userId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const [logSets, manualSets] = await Promise.all([
        fetchLogSets(userId),
        fetchManualSets(userId),
      ]);
      res.json(summarizeFromRows(logSets, manualSets));
    })
  );

  router.get(
    '/:id/exercise-records/:exerciseId',
    requireMemberAccess('id'),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = parseInt(req.params.id, 10);
      const exerciseId = parseInt(req.params.exerciseId, 10);
      if (Number.isNaN(userId) || Number.isNaN(exerciseId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const { rows: exerciseRows } = await query<{
        id: number;
        name: string;
        muscle_group: string;
      }>('SELECT id, name, muscle_group FROM exercises WHERE id = $1', [exerciseId]);
      if (exerciseRows.length === 0) {
        res.status(404).json({ error: 'Ejercicio no encontrado' });
        return;
      }
      const exercise = exerciseRows[0];

      const [logSets, manualSets] = await Promise.all([
        fetchLogSets(userId, exerciseId),
        fetchManualSets(userId, exerciseId),
      ]);

      const summaries = summarizeFromRows(logSets, manualSets);
      const summary =
        summaries[0] ??
        buildExerciseSummary(exerciseId, exercise.name, exercise.muscle_group, [], 0);

      const timelineMap = new Map<number, SessionTimelinePoint>();
      for (const row of logSets) {
        const date = dateOnly(row.performed_at);
        const e1rm = estimateOneRmEpley(row.weight, row.reps);
        const existing = timelineMap.get(row.session_id);
        if (!existing) {
          timelineMap.set(row.session_id, {
            session_id: row.session_id,
            date,
            max_weight_kg: row.weight,
            max_reps_at_max_weight: row.reps,
            estimated_1rm_kg: e1rm,
          });
          continue;
        }
        if (
          row.weight > existing.max_weight_kg ||
          (row.weight === existing.max_weight_kg && row.reps > existing.max_reps_at_max_weight)
        ) {
          existing.max_weight_kg = row.weight;
          existing.max_reps_at_max_weight = row.reps;
        }
        existing.estimated_1rm_kg = Math.max(existing.estimated_1rm_kg, e1rm);
      }

      const timeline = [...timelineMap.values()].sort((a, b) => a.date.localeCompare(b.date));

      const repsAtWeight = mergeRepsAtWeight([
        ...logSets.map((row) => ({
          weight: row.weight,
          reps: row.reps,
          source: 'log' as const,
        })),
        ...manualSets.map((row) => ({
          weight: row.weight,
          reps: row.reps,
          source: 'manual' as const,
        })),
      ]);

      let manual_tests: RmTestRow[] = [];
      try {
        const { rows } = await query<{
          id: number;
          weight: number;
          reps: number;
          test_date: string;
          notes: string | null;
          recorded_by: number | null;
          recorded_by_name: string | null;
          created_at: string;
        }>(
          `SELECT t.id, t.weight::float8 AS weight, t.reps::int AS reps,
                  t.test_date::text AS test_date, t.notes,
                  t.recorded_by, u.full_name AS recorded_by_name,
                  t.created_at::text AS created_at
           FROM exercise_rm_tests t
           LEFT JOIN users u ON u.id = t.recorded_by
           WHERE t.user_id = $1 AND t.exercise_id = $2
           ORDER BY t.test_date DESC, t.created_at DESC`,
          [userId, exerciseId]
        );
        manual_tests = rows.map((row) => ({
          id: Number(row.id),
          weight: Number(row.weight),
          reps: Number(row.reps),
          test_date: dateOnly(row.test_date),
          notes: row.notes,
          recorded_by: row.recorded_by != null ? Number(row.recorded_by) : null,
          recorded_by_name: row.recorded_by_name,
          created_at: row.created_at,
          estimated_1rm_kg: estimateOneRmEpley(Number(row.weight), Number(row.reps)),
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!/exercise_rm_tests|does not exist|undefined_table/i.test(message)) {
          throw err;
        }
      }

      res.json({
        exercise_id: exerciseId,
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        summary,
        timeline,
        reps_at_weight: repsAtWeight,
        manual_tests,
      });
    })
  );

  router.post(
    '/:id/exercise-records/:exerciseId/tests',
    requireMemberAccess('id'),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = parseInt(req.params.id, 10);
      const exerciseId = parseInt(req.params.exerciseId, 10);
      if (Number.isNaN(userId) || Number.isNaN(exerciseId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const parsed = rmTestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const { rows: exerciseRows } = await query<{ id: number }>(
        'SELECT id FROM exercises WHERE id = $1',
        [exerciseId]
      );
      if (!exerciseRows[0]) {
        res.status(404).json({ error: 'Ejercicio no encontrado' });
        return;
      }

      const { weight, reps, test_date, notes } = parsed.data;
      const testDate = test_date ?? new Date().toISOString().slice(0, 10);

      try {
        const { rows } = await query<{
          id: number;
          weight: number;
          reps: number;
          test_date: string;
          notes: string | null;
          recorded_by: number | null;
          created_at: string;
        }>(
          `INSERT INTO exercise_rm_tests
             (user_id, exercise_id, weight, reps, test_date, notes, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, weight::float8 AS weight, reps::int AS reps,
                     test_date::text AS test_date, notes, recorded_by,
                     created_at::text AS created_at`,
          [userId, exerciseId, weight, reps, testDate, notes ?? null, req.user?.id ?? null]
        );

        const row = rows[0];
        res.status(201).json({
          id: Number(row.id),
          weight: Number(row.weight),
          reps: Number(row.reps),
          test_date: dateOnly(row.test_date),
          notes: row.notes,
          recorded_by: row.recorded_by != null ? Number(row.recorded_by) : null,
          recorded_by_name: null,
          created_at: row.created_at,
          estimated_1rm_kg: estimateOneRmEpley(Number(row.weight), Number(row.reps)),
        } satisfies RmTestRow);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (/exercise_rm_tests|does not exist|undefined_table/i.test(message)) {
          res.status(503).json({
            error: 'La tabla de pruebas RM aún no está disponible. Aplica la migración.',
          });
          return;
        }
        throw err;
      }
    })
  );

  router.delete(
    '/:id/exercise-records/:exerciseId/tests/:testId',
    requireMemberAccess('id'),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = parseInt(req.params.id, 10);
      const exerciseId = parseInt(req.params.exerciseId, 10);
      const testId = parseInt(req.params.testId, 10);
      if (Number.isNaN(userId) || Number.isNaN(exerciseId) || Number.isNaN(testId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      try {
        const { rows } = await query<{ id: number }>(
          `DELETE FROM exercise_rm_tests
           WHERE id = $1 AND user_id = $2 AND exercise_id = $3
           RETURNING id`,
          [testId, userId, exerciseId]
        );
        if (!rows[0]) {
          res.status(404).json({ error: 'Prueba no encontrada' });
          return;
        }
        res.json({ success: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (/exercise_rm_tests|does not exist|undefined_table/i.test(message)) {
          res.status(503).json({
            error: 'La tabla de pruebas RM aún no está disponible. Aplica la migración.',
          });
          return;
        }
        throw err;
      }
    })
  );
}
