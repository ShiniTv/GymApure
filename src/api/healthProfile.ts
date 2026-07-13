import { z } from 'zod';
import { query } from '../db/index.ts';
import type { AuthRequest } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import {
  HEALTH_CONDITION_FLAG_IDS,
  formatHealthFlagsForDisplay,
  isValidHealthConditionFlag,
} from '../lib/healthConditions.ts';
import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  getAgeFromDob,
  type ActivityLevel,
  type BiologicalSex,
} from '../lib/metabolicRate.ts';
import type { Router } from 'express';

const healthProfilePatchSchema = z.object({
  condition_flags: z.array(z.string()).max(HEALTH_CONDITION_FLAG_IDS.length).optional(),
  conditions_notes: z.string().trim().max(4000).nullable().optional(),
  limitations_notes: z.string().trim().max(4000).nullable().optional(),
  allergies_notes: z.string().trim().max(2000).nullable().optional(),
  medications_notes: z.string().trim().max(2000).nullable().optional(),
  sex: z.enum(['male', 'female']).nullable().optional(),
  activity_level: z
    .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
    .nullable()
    .optional(),
  health_consent: z.boolean().optional(),
  compute_metabolic: z.boolean().optional(),
});

interface HealthProfileRow {
  user_id: number;
  condition_flags: string[];
  conditions_notes: string | null;
  limitations_notes: string | null;
  allergies_notes: string | null;
  medications_notes: string | null;
  sex: BiologicalSex | null;
  activity_level: ActivityLevel | null;
  bmr_kcal: number | null;
  tdee_kcal: number | null;
  weight_used_kg: number | null;
  health_consent_at: string | null;
  metabolic_computed_at: string | null;
  updated_at: string;
}

function emptyHealthProfile(userId: number) {
  return {
    user_id: userId,
    condition_flags: [] as string[],
    condition_labels: [] as { id: string; label: string }[],
    conditions_notes: null,
    limitations_notes: null,
    allergies_notes: null,
    medications_notes: null,
    sex: null,
    activity_level: null,
    bmr_kcal: null,
    tdee_kcal: null,
    weight_used_kg: null,
    health_consent_at: null,
    metabolic_computed_at: null,
    updated_at: null,
  };
}

function serializeHealthProfile(row: HealthProfileRow) {
  const flags = Array.isArray(row.condition_flags) ? row.condition_flags : [];
  return {
    user_id: row.user_id,
    condition_flags: flags,
    condition_labels: formatHealthFlagsForDisplay(flags),
    conditions_notes: row.conditions_notes,
    limitations_notes: row.limitations_notes,
    allergies_notes: row.allergies_notes,
    medications_notes: row.medications_notes,
    sex: row.sex,
    activity_level: row.activity_level,
    bmr_kcal: row.bmr_kcal,
    tdee_kcal: row.tdee_kcal,
    weight_used_kg: row.weight_used_kg,
    health_consent_at: row.health_consent_at,
    metabolic_computed_at: row.metabolic_computed_at,
    updated_at: row.updated_at,
  };
}

async function getHealthProfileRow(userId: number): Promise<HealthProfileRow | null> {
  const { rows } = await query<HealthProfileRow>(
    `SELECT user_id, condition_flags, conditions_notes, limitations_notes,
            allergies_notes, medications_notes, sex, activity_level,
            bmr_kcal, tdee_kcal, weight_used_kg, health_consent_at,
            metabolic_computed_at, updated_at
     FROM member_health_profiles
     WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function resolveWeightKg(userId: number): Promise<number | null> {
  const { rows: meas } = await query<{ weight: number }>(
    `SELECT weight FROM user_measurements
     WHERE user_id = $1 AND weight IS NOT NULL
     ORDER BY date DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  if (meas[0]?.weight) return meas[0].weight;

  const { rows: user } = await query<{ initial_weight: number | null }>(
    `SELECT initial_weight FROM users WHERE id = $1`,
    [userId]
  );
  return user[0]?.initial_weight ?? null;
}

async function resolveAnthropometrics(userId: number) {
  const { rows } = await query<{ dob: string | null; height: number | null }>(
    `SELECT dob, height FROM users WHERE id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return null;

  const weightKg = await resolveWeightKg(userId);
  if (!user.dob || !user.height || !weightKg) return null;

  let age: number;
  try {
    age = getAgeFromDob(user.dob);
  } catch {
    return null;
  }

  return { weightKg, heightCm: user.height, age };
}

function sanitizeFlags(flags: string[] | undefined): string[] {
  if (!flags) return [];
  const unique = new Set<string>();
  for (const flag of flags) {
    if (isValidHealthConditionFlag(flag)) unique.add(flag);
  }
  return [...unique];
}

export function mountHealthProfileRoutes(router: Router): void {
  router.get(
    '/:id/health-profile',
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.id, 10);
      const row = await getHealthProfileRow(userId);
      if (!row) {
        res.json(emptyHealthProfile(userId));
        return;
      }
      res.json(serializeHealthProfile(row));
    })
  );

  router.patch(
    '/:id/health-profile',
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = parseInt(req.params.id, 10);
      if (req.user?.id !== userId || req.user.role !== 'member') {
        res.status(403).json({ error: 'Solo puedes actualizar tu propio perfil de salud' });
        return;
      }

      const parsed = healthProfilePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const data = parsed.data;
      const existing = await getHealthProfileRow(userId);

      if (!existing?.health_consent_at && !data.health_consent) {
        res.status(400).json({
          error: 'Debes aceptar el aviso de información de salud antes de guardar',
        });
        return;
      }

      const conditionFlags =
        data.condition_flags !== undefined
          ? sanitizeFlags(data.condition_flags)
          : (existing?.condition_flags ?? []);

      const sex = data.sex !== undefined ? data.sex : (existing?.sex ?? null);
      const activityLevel =
        data.activity_level !== undefined
          ? data.activity_level
          : (existing?.activity_level ?? null);

      let bmrKcal = existing?.bmr_kcal ?? null;
      let tdeeKcal = existing?.tdee_kcal ?? null;
      let weightUsed = existing?.weight_used_kg ?? null;
      let metabolicComputedAt = existing?.metabolic_computed_at ?? null;

      const wantsMetabolic =
        data.compute_metabolic === true ||
        data.sex !== undefined ||
        data.activity_level !== undefined;

      if (wantsMetabolic && sex && activityLevel) {
        const anthropometrics = await resolveAnthropometrics(userId);
        if (!anthropometrics) {
          res.status(400).json({
            error:
              'Completa fecha de nacimiento, altura y peso en la pestaña Datos para calcular TMB y GET',
          });
          return;
        }
        try {
          bmrKcal = calculateBmrMifflinStJeor({
            sex,
            weightKg: anthropometrics.weightKg,
            heightCm: anthropometrics.heightCm,
            age: anthropometrics.age,
          });
          tdeeKcal = calculateTdee(bmrKcal, activityLevel);
          weightUsed = anthropometrics.weightKg;
          metabolicComputedAt = new Date().toISOString();
        } catch (err) {
          res.status(400).json({
            error: err instanceof Error ? err.message : 'No se pudo calcular el metabolismo',
          });
          return;
        }
      }

      const consentAt =
        existing?.health_consent_at ?? (data.health_consent ? new Date().toISOString() : null);

      const { rows } = await query<HealthProfileRow>(
        `INSERT INTO member_health_profiles (
           user_id, condition_flags, conditions_notes, limitations_notes,
           allergies_notes, medications_notes, sex, activity_level,
           bmr_kcal, tdee_kcal, weight_used_kg, health_consent_at,
           metabolic_computed_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           condition_flags = EXCLUDED.condition_flags,
           conditions_notes = EXCLUDED.conditions_notes,
           limitations_notes = EXCLUDED.limitations_notes,
           allergies_notes = EXCLUDED.allergies_notes,
           medications_notes = EXCLUDED.medications_notes,
           sex = EXCLUDED.sex,
           activity_level = EXCLUDED.activity_level,
           bmr_kcal = EXCLUDED.bmr_kcal,
           tdee_kcal = EXCLUDED.tdee_kcal,
           weight_used_kg = EXCLUDED.weight_used_kg,
           health_consent_at = COALESCE(member_health_profiles.health_consent_at, EXCLUDED.health_consent_at),
           metabolic_computed_at = EXCLUDED.metabolic_computed_at,
           updated_at = NOW()
         RETURNING user_id, condition_flags, conditions_notes, limitations_notes,
                   allergies_notes, medications_notes, sex, activity_level,
                   bmr_kcal, tdee_kcal, weight_used_kg, health_consent_at,
                   metabolic_computed_at, updated_at`,
        [
          userId,
          conditionFlags,
          data.conditions_notes !== undefined
            ? data.conditions_notes
            : (existing?.conditions_notes ?? null),
          data.limitations_notes !== undefined
            ? data.limitations_notes
            : (existing?.limitations_notes ?? null),
          data.allergies_notes !== undefined
            ? data.allergies_notes
            : (existing?.allergies_notes ?? null),
          data.medications_notes !== undefined
            ? data.medications_notes
            : (existing?.medications_notes ?? null),
          sex,
          activityLevel,
          bmrKcal,
          tdeeKcal,
          weightUsed,
          consentAt,
          metabolicComputedAt,
        ]
      );

      res.json(serializeHealthProfile(rows[0]));
    })
  );
}
