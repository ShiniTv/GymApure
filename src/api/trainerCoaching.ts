import { z } from 'zod';
import type { Router } from 'express';
import { query } from '../db/index.ts';
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
}
