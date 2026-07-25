import { z } from 'zod';
import type { Router } from 'express';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/index.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import { estimateOneRmEpley } from '../lib/exerciseRecords.ts';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

const assessmentSchema = z.object({
  primary_goal: nullableText(500),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  preferences: nullableText(2000),
  equipment_access: nullableText(1000),
  mobility_notes: nullableText(2000),
  coaching_notes: nullableText(4000),
});

const checkinSchema = z.object({
  week_of: z.string().date().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  sleep_quality: z.number().int().min(1).max(5).nullable().optional(),
  stress_level: z.number().int().min(1).max(5).nullable().optional(),
  soreness_level: z.number().int().min(1).max(5).nullable().optional(),
  adherence_score: z.number().int().min(1).max(5).nullable().optional(),
  notes: nullableText(2000),
});
const loadSuggestionQuerySchema = z.object({
  exercise_id: z.coerce.number().int().positive(),
  routine_id: z.coerce.number().int().positive(),
});
const reviewSuggestionSchema = z.object({
  trainer_note: z.string().trim().max(500).optional(),
  acknowledge_shared_routine: z.boolean().optional(),
});

type SuggestionType = 'load_increase' | 'load_decrease' | 'maintain' | 'deload';

interface RoutineExerciseForSuggestion {
  routine_id: number;
  trainer_id: number;
  routine_name: string;
  routine_exercise_id: number;
  exercise_id: number;
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number | null;
  weight_suggestion: string | null;
}

interface CoachingSignals {
  energy: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  adherence_score: number | null;
  feedback_count: number;
  average_exertion: number | null;
  average_energy: number | null;
  average_discomfort: number | null;
}

function buildSuggestion(
  exercise: RoutineExerciseForSuggestion,
  signals: CoachingSignals
): {
  suggestionType: SuggestionType;
  currentSnapshot: Record<string, unknown>;
  proposedSnapshot: Record<string, unknown>;
  rationale: Record<string, unknown>;
} {
  const currentSnapshot = {
    sets: exercise.sets,
    reps: exercise.reps,
    rest_seconds: exercise.rest_seconds,
    weight_suggestion: exercise.weight_suggestion,
  };
  const needsDeload =
    (signals.soreness_level !== null && signals.soreness_level >= 4) ||
    (signals.energy !== null && signals.energy <= 2) ||
    (signals.sleep_quality !== null && signals.sleep_quality <= 2) ||
    (signals.stress_level !== null && signals.stress_level >= 4) ||
    (signals.average_discomfort !== null && signals.average_discomfort >= 4) ||
    (signals.average_energy !== null && signals.average_energy <= 2);
  const readyToProgress =
    signals.adherence_score !== null &&
    signals.adherence_score >= 4 &&
    signals.energy !== null &&
    signals.energy >= 4 &&
    signals.sleep_quality !== null &&
    signals.sleep_quality >= 4 &&
    (signals.stress_level === null || signals.stress_level <= 2) &&
    (signals.soreness_level === null || signals.soreness_level <= 2) &&
    (signals.average_discomfort === null || signals.average_discomfort <= 2) &&
    (signals.average_exertion === null || signals.average_exertion <= 7);

  if (needsDeload) {
    return {
      suggestionType: 'deload',
      currentSnapshot,
      proposedSnapshot: {
        ...currentSnapshot,
        sets: Math.max(1, exercise.sets - 1),
        weight_suggestion: 'Reducir la carga aproximada un 10%',
      },
      rationale: {
        rule: 'recovery_guard',
        message: 'Señales de recuperación baja o molestias elevadas; reducir volumen y carga.',
        signals,
      },
    };
  }

  if (readyToProgress) {
    return {
      suggestionType: 'load_increase',
      currentSnapshot,
      proposedSnapshot: {
        ...currentSnapshot,
        reps: exercise.reps + 1,
        weight_suggestion: 'Probar un aumento gradual de carga si se mantiene la técnica',
      },
      rationale: {
        rule: 'progression_ready',
        message: 'Buena adherencia y recuperación; se puede progresar de forma gradual.',
        signals,
      },
    };
  }

  return {
    suggestionType: 'maintain',
    currentSnapshot,
    proposedSnapshot: currentSnapshot,
    rationale: {
      rule: 'maintain',
      message: 'No hay señales suficientes para cambiar la prescripción esta semana.',
      signals,
    },
  };
}

async function getCoachingSignals(memberId: number): Promise<CoachingSignals> {
  const [checkinResult, feedbackResult] = await Promise.all([
    query<
      Omit<
        CoachingSignals,
        'feedback_count' | 'average_exertion' | 'average_energy' | 'average_discomfort'
      >
    >(
      `SELECT energy, sleep_quality, stress_level, soreness_level, adherence_score
       FROM member_weekly_checkins
       WHERE member_id = $1
       ORDER BY week_of DESC
       LIMIT 1`,
      [memberId]
    ),
    query<{
      feedback_count: number;
      average_exertion: number | null;
      average_energy: number | null;
      average_discomfort: number | null;
    }>(
      `SELECT COUNT(*)::int AS feedback_count,
              AVG(exertion)::float8 AS average_exertion,
              AVG(energy)::float8 AS average_energy,
              AVG(discomfort)::float8 AS average_discomfort
       FROM workout_feedback
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'`,
      [memberId]
    ),
  ]);
  const checkin = checkinResult.rows[0];
  const feedback = feedbackResult.rows[0];
  return {
    energy: checkin?.energy ?? null,
    sleep_quality: checkin?.sleep_quality ?? null,
    stress_level: checkin?.stress_level ?? null,
    soreness_level: checkin?.soreness_level ?? null,
    adherence_score: checkin?.adherence_score ?? null,
    feedback_count: feedback?.feedback_count ?? 0,
    average_exertion: feedback?.average_exertion ?? null,
    average_energy: feedback?.average_energy ?? null,
    average_discomfort: feedback?.average_discomfort ?? null,
  };
}

async function getAccessibleRoutineExercises(
  memberId: number,
  user: NonNullable<AuthRequest['user']>
): Promise<RoutineExerciseForSuggestion[]> {
  const params: number[] = [memberId];
  const trainerFilter =
    user.role === 'trainer' ? ` AND r.trainer_id = $${params.push(user.id)}` : '';
  const { rows } = await query<RoutineExerciseForSuggestion>(
    `SELECT r.id AS routine_id, r.trainer_id, r.name AS routine_name, re.id AS routine_exercise_id,
            re.exercise_id, e.name AS exercise_name, re.sets, re.reps, re.rest_seconds,
            re.weight_suggestion
     FROM user_routines ur
     JOIN routines r ON r.id = ur.routine_id
     JOIN routine_exercises re ON re.routine_id = r.id
     JOIN exercises e ON e.id = re.exercise_id
     WHERE ur.user_id = $1${trainerFilter}
     ORDER BY r.id, re.id`,
    params
  );
  return rows;
}

function startOfWeek(value = new Date()): string {
  const date = new Date(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function parseMemberId(raw: string): number | null {
  const memberId = parseInt(raw, 10);
  return Number.isSafeInteger(memberId) && memberId > 0 ? memberId : null;
}

export function mountTrainerCoachingRoutes(router: Router): void {
  router.get(
    '/:id/training-assessment',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const { rows } = await query(
        `SELECT member_id, updated_by, primary_goal, experience_level, preferences, equipment_access,
                mobility_notes, coaching_notes, created_at::text, updated_at::text
         FROM member_training_assessments WHERE member_id = $1`,
        [memberId]
      );
      res.json(rows[0] ?? null);
    })
  );

  router.put(
    '/:id/training-assessment',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const parsed = assessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const data = parsed.data;
      const { rows } = await query(
        `INSERT INTO member_training_assessments (
           member_id, updated_by, primary_goal, experience_level, preferences, equipment_access,
           mobility_notes, coaching_notes, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (member_id) DO UPDATE SET
           updated_by = EXCLUDED.updated_by,
           primary_goal = EXCLUDED.primary_goal,
           experience_level = EXCLUDED.experience_level,
           preferences = EXCLUDED.preferences,
           equipment_access = EXCLUDED.equipment_access,
           mobility_notes = EXCLUDED.mobility_notes,
           coaching_notes = EXCLUDED.coaching_notes,
           updated_at = NOW()
         RETURNING member_id, updated_by, primary_goal, experience_level, preferences, equipment_access,
                   mobility_notes, coaching_notes, created_at::text, updated_at::text`,
        [
          memberId,
          req.user!.id,
          data.primary_goal ?? null,
          data.experience_level ?? null,
          data.preferences ?? null,
          data.equipment_access ?? null,
          data.mobility_notes ?? null,
          data.coaching_notes ?? null,
        ]
      );
      res.json(rows[0]);
    })
  );

  router.get(
    '/:id/weekly-checkins',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const { rows } = await query(
        `SELECT id, member_id, recorded_by, week_of::text, energy, sleep_quality, stress_level,
                soreness_level, adherence_score, notes, created_at::text, updated_at::text
         FROM member_weekly_checkins WHERE member_id = $1
         ORDER BY week_of DESC LIMIT 12`,
        [memberId]
      );
      res.json(rows);
    })
  );

  router.put(
    '/:id/weekly-checkins',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const parsed = checkinSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const data = parsed.data;
      const weekOf = data.week_of ?? startOfWeek();
      const { rows } = await query(
        `INSERT INTO member_weekly_checkins (
           member_id, recorded_by, week_of, energy, sleep_quality, stress_level,
           soreness_level, adherence_score, notes, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (member_id, week_of) DO UPDATE SET
           recorded_by = EXCLUDED.recorded_by,
           energy = EXCLUDED.energy,
           sleep_quality = EXCLUDED.sleep_quality,
           stress_level = EXCLUDED.stress_level,
           soreness_level = EXCLUDED.soreness_level,
           adherence_score = EXCLUDED.adherence_score,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING id, member_id, recorded_by, week_of::text, energy, sleep_quality, stress_level,
                   soreness_level, adherence_score, notes, created_at::text, updated_at::text`,
        [
          memberId,
          req.user!.id,
          weekOf,
          data.energy ?? null,
          data.sleep_quality ?? null,
          data.stress_level ?? null,
          data.soreness_level ?? null,
          data.adherence_score ?? null,
          data.notes ?? null,
        ]
      );
      res.json(rows[0]);
    })
  );

  router.get(
    '/:id/exercise-load-suggestion',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const parsed = loadSuggestionQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const { exercise_id: exerciseId, routine_id: routineId } = parsed.data;
      const [lastSession, rmTests] = await Promise.all([
        query<{ weight: number; reps: number; completed_at: string }>(
          `WITH last_completed AS (
             SELECT id, end_time
             FROM workout_sessions
             WHERE user_id = $1 AND routine_id = $2
               AND end_time IS NOT NULL AND success = 1
             ORDER BY start_time DESC
             LIMIT 1
           )
           SELECT wl.weight::float8 AS weight, wl.reps::int AS reps,
                  last_completed.end_time::text AS completed_at
           FROM workout_logs wl
           JOIN last_completed ON last_completed.id = wl.session_id
           WHERE wl.exercise_id = $3
           ORDER BY wl.weight DESC, wl.reps DESC
           LIMIT 1`,
          [memberId, routineId, exerciseId]
        ),
        query<{ weight: number; reps: number; test_date: string }>(
          `SELECT weight::float8 AS weight, reps::int AS reps, test_date::text
           FROM exercise_rm_tests
           WHERE user_id = $1 AND exercise_id = $2
           ORDER BY test_date DESC, created_at DESC
           LIMIT 1`,
          [memberId, exerciseId]
        ),
      ]);

      const last = lastSession.rows[0] ?? null;
      const rm = rmTests.rows[0] ?? null;
      const estimatedOneRm = Math.max(
        last ? estimateOneRmEpley(last.weight, last.reps) : 0,
        rm ? estimateOneRmEpley(rm.weight, rm.reps) : 0
      );
      res.json({
        last_session: last,
        rm_test: rm
          ? {
              ...rm,
              estimated_1rm_kg: estimateOneRmEpley(rm.weight, rm.reps),
            }
          : null,
        estimated_1rm_kg: estimatedOneRm > 0 ? estimatedOneRm : null,
      });
    })
  );

  router.get(
    '/:id/coaching-suggestions',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const params: number[] = [memberId];
      const trainerFilter =
        req.user!.role === 'trainer'
          ? ` AND s.trainer_id = $${params.push(req.user!.id)} AND r.trainer_id = $${params.length}`
          : '';
      const { rows } = await query(
        `SELECT s.id, s.member_id, s.trainer_id, s.routine_id, s.routine_exercise_id, s.exercise_id,
                s.status, s.suggestion_type, s.current_snapshot, s.proposed_snapshot, s.rationale,
                s.trainer_note, s.reviewed_by, s.reviewed_at::text, s.created_at::text, s.updated_at::text,
                r.name AS routine_name, e.name AS exercise_name
         FROM member_coaching_suggestions s
         JOIN routines r ON r.id = s.routine_id
         JOIN exercises e ON e.id = s.exercise_id
         WHERE s.member_id = $1${trainerFilter}
         ORDER BY CASE s.status WHEN 'pending' THEN 0 ELSE 1 END, s.created_at DESC`,
        params
      );
      res.json(rows);
    })
  );

  router.post(
    '/:id/coaching-suggestions/generate',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseMemberId(req.params.id);
      if (!memberId) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const [signals, exercises] = await Promise.all([
        getCoachingSignals(memberId),
        getAccessibleRoutineExercises(memberId, req.user!),
      ]);
      if (exercises.length === 0) {
        res
          .status(404)
          .json({ error: 'No hay ejercicios de rutina asignados para generar sugerencias' });
        return;
      }

      const suggestions = await withTransaction(async (client: PoolClient) => {
        const created = [];
        for (const exercise of exercises) {
          const suggestion = buildSuggestion(exercise, signals);
          const { rows } = await client.query(
            `INSERT INTO member_coaching_suggestions (
               member_id, trainer_id, routine_id, routine_exercise_id, exercise_id, suggestion_type,
               current_snapshot, proposed_snapshot, rationale, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, NOW())
             ON CONFLICT (member_id, routine_exercise_id) WHERE status = 'pending' DO UPDATE SET
               trainer_id = EXCLUDED.trainer_id,
               suggestion_type = EXCLUDED.suggestion_type,
               current_snapshot = EXCLUDED.current_snapshot,
               proposed_snapshot = EXCLUDED.proposed_snapshot,
               rationale = EXCLUDED.rationale,
               updated_at = NOW()
             RETURNING id, status, suggestion_type, routine_id, routine_exercise_id, exercise_id,
                       current_snapshot, proposed_snapshot, rationale, created_at::text, updated_at::text`,
            [
              memberId,
              req.user!.role === 'trainer' ? req.user!.id : exercise.trainer_id,
              exercise.routine_id,
              exercise.routine_exercise_id,
              exercise.exercise_id,
              suggestion.suggestionType,
              JSON.stringify(suggestion.currentSnapshot),
              JSON.stringify(suggestion.proposedSnapshot),
              JSON.stringify(suggestion.rationale),
            ]
          );
          created.push(rows[0]);
        }
        return created;
      });
      res.status(201).json({ suggestions, signals });
    })
  );

  router.post(
    '/:id/coaching-suggestions/:suggestionId/approve',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseMemberId(req.params.id);
      const suggestionId = parseInt(req.params.suggestionId, 10);
      if (!memberId || !Number.isSafeInteger(suggestionId) || suggestionId <= 0) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const parsed = reviewSuggestionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const suggestion = await withTransaction(async (client: PoolClient) => {
        const ownershipParams: number[] = [suggestionId, memberId];
        if (req.user!.role === 'trainer') ownershipParams.push(req.user!.id);
        const trainerFilter =
          req.user!.role === 'trainer' ? ` AND s.trainer_id = $3 AND r.trainer_id = $3` : '';
        const { rows } = await client.query<{
          id: number;
          routine_id: number;
          routine_exercise_id: number;
          status: string;
          proposed_snapshot: {
            sets: number;
            reps: number;
            rest_seconds: number | null;
            weight_suggestion: string | null;
          };
        }>(
          `SELECT s.id, s.routine_id, s.routine_exercise_id, s.status, s.proposed_snapshot
           FROM member_coaching_suggestions s
           JOIN routines r ON r.id = s.routine_id
           WHERE s.id = $1 AND s.member_id = $2
             AND EXISTS (
               SELECT 1 FROM user_routines ur
               WHERE ur.user_id = s.member_id AND ur.routine_id = s.routine_id
             )${trainerFilter}
           FOR UPDATE`,
          ownershipParams
        );
        const current = rows[0];
        if (!current) throw Object.assign(new Error('Sugerencia no encontrada'), { status: 404 });
        if (current.status !== 'pending') {
          throw Object.assign(new Error('La sugerencia ya fue revisada'), { status: 409 });
        }

        const { rows: shareRows } = await client.query<{ shared_count: number }>(
          `SELECT COUNT(*)::int AS shared_count
           FROM user_routines
           WHERE routine_id = $1 AND user_id <> $2`,
          [current.routine_id, memberId]
        );
        if (shareRows[0].shared_count > 0 && !parsed.data.acknowledge_shared_routine) {
          throw Object.assign(
            new Error(
              'Esta rutina está compartida; confirma que deseas actualizarla para todos los miembros'
            ),
            { status: 409, code: 'shared_routine_acknowledgment_required' }
          );
        }

        const proposed = current.proposed_snapshot;
        const updateResult = await client.query(
          `UPDATE routine_exercises
           SET sets = $1, reps = $2, rest_seconds = $3, weight_suggestion = $4
           WHERE id = $5 AND routine_id = $6
           RETURNING id`,
          [
            proposed.sets,
            proposed.reps,
            proposed.rest_seconds,
            proposed.weight_suggestion,
            current.routine_exercise_id,
            current.routine_id,
          ]
        );
        if (updateResult.rowCount !== 1) {
          throw Object.assign(new Error('El ejercicio de rutina ya no existe'), { status: 409 });
        }
        const { rows: reviewed } = await client.query(
          `UPDATE member_coaching_suggestions
           SET status = 'approved', trainer_note = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
           WHERE id = $3
           RETURNING id, status, reviewed_by, reviewed_at::text, trainer_note`,
          [parsed.data.trainer_note ?? null, req.user!.id, current.id]
        );
        await client.query(
          'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
          [
            req.user!.id,
            'member_coaching_suggestion_approved',
            JSON.stringify({
              suggestion_id: current.id,
              member_id: memberId,
              routine_id: current.routine_id,
            }),
          ]
        );
        return reviewed[0];
      });
      res.json(suggestion);
    })
  );

  router.post(
    '/:id/coaching-suggestions/:suggestionId/dismiss',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseMemberId(req.params.id);
      const suggestionId = parseInt(req.params.suggestionId, 10);
      if (!memberId || !Number.isSafeInteger(suggestionId) || suggestionId <= 0) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const parsed = reviewSuggestionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }
      const params: (number | string | null)[] = [
        parsed.data.trainer_note ?? null,
        req.user!.id,
        suggestionId,
        memberId,
      ];
      const trainerFilter =
        req.user!.role === 'trainer'
          ? ` AND s.trainer_id = $${params.push(req.user!.id)} AND r.trainer_id = $${params.length}`
          : '';
      const { rows } = await query(
        `UPDATE member_coaching_suggestions AS s
         SET status = 'dismissed', trainer_note = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         FROM routines r
         WHERE s.routine_id = r.id AND s.id = $3 AND s.member_id = $4 AND s.status = 'pending'${trainerFilter}
         RETURNING s.id, s.status, s.reviewed_by, s.reviewed_at::text, s.trainer_note, s.routine_id`,
        params
      );
      const dismissed = rows[0];
      if (!dismissed) {
        res.status(404).json({ error: 'Sugerencia pendiente no encontrada' });
        return;
      }
      await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)', [
        req.user!.id,
        'member_coaching_suggestion_dismissed',
        JSON.stringify({
          suggestion_id: suggestionId,
          member_id: memberId,
          routine_id: dismissed.routine_id,
        }),
      ]);
      res.json(dismissed);
    })
  );
}
