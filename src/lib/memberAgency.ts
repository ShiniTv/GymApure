import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/index.ts';
import { ensureTrainerMemberAssignment } from './trainerAccess.ts';

export type MemberActivityEventType =
  'self_assigned_template' | 'exercise_substituted' | 'exercise_skipped';

export interface MemberActivityEventRow {
  id: number;
  member_id: number;
  trainer_id: number;
  event_type: MemberActivityEventType;
  routine_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  acknowledged_at: string | null;
  member_name?: string;
}

const SUGGESTED_NUTRITION_PLAN = {
  title: 'Plan sugerido del gym',
  calories_target: 2200,
  protein_target_g: 140,
  carbs_target_g: 220,
  fat_target_g: 70,
  calories_margin: 150,
  protein_margin_g: 15,
  carbs_margin_g: 25,
  fat_margin_g: 10,
  notes:
    'Valores orientativos para empezar a registrar. Tu entrenador puede personalizar tu plan cuando lo revise.',
} as const;

export function getSuggestedNutritionPlanDefaults() {
  return { ...SUGGESTED_NUTRITION_PLAN, is_suggested: true as const };
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isMemberAgencySchemaMissing(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  if (
    !msg.includes('does not exist') &&
    !msg.includes('undefined_table') &&
    !msg.includes('undefined_column')
  ) {
    return false;
  }
  return (
    msg.includes('member_activity_events') ||
    msg.includes('member_daily_routine_choice') ||
    msg.includes('member_selectable')
  );
}

async function withMemberAgencyFallback<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isMemberAgencySchemaMissing(err)) return fallback;
    throw err;
  }
}

export async function getMemberAssignedTrainerIds(memberId: number): Promise<number[]> {
  const { rows } = await query<{ trainer_id: number }>(
    `SELECT trainer_id FROM trainer_member_assignments WHERE member_id = $1`,
    [memberId]
  );
  return rows.map((r) => r.trainer_id);
}

export async function memberCanSelectTemplate(
  memberId: number,
  templateRoutineId: number
): Promise<{ ok: true; trainerId: number } | { ok: false; reason: string }> {
  const { rows } = await query<{
    trainer_id: number;
    member_selectable: boolean;
    exercise_count: string;
  }>(
    `SELECT r.trainer_id, r.member_selectable,
            (SELECT COUNT(*)::text FROM routine_exercises re WHERE re.routine_id = r.id) AS exercise_count
     FROM routines r
     WHERE r.id = $1`,
    [templateRoutineId]
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: 'Plantilla no encontrada' };
  if (!row.member_selectable)
    return { ok: false, reason: 'Esta rutina no está disponible para auto-asignación' };
  if (parseInt(row.exercise_count, 10) === 0) {
    return { ok: false, reason: 'La plantilla no tiene ejercicios' };
  }

  const trainers = await getMemberAssignedTrainerIds(memberId);
  if (trainers.length === 0) {
    // Allow templates from routine trainer even without explicit assignment (first self-start).
    return { ok: true, trainerId: row.trainer_id };
  }
  if (!trainers.includes(row.trainer_id)) {
    return { ok: false, reason: 'Plantilla de un entrenador no asignado' };
  }
  return { ok: true, trainerId: row.trainer_id };
}

export async function cloneRoutineForMember(
  client: PoolClient,
  sourceRoutineId: number,
  trainerId: number,
  memberId: number,
  name?: string
): Promise<{ id: number; name: string }> {
  const source = await client.query<{ name: string; difficulty: string | null }>(
    'SELECT name, difficulty FROM routines WHERE id = $1',
    [sourceRoutineId]
  );
  const sourceRoutine = source.rows[0];
  if (!sourceRoutine) throw new Error('Plantilla no encontrada');

  const routineName = name?.trim() || sourceRoutine.name;
  const created = await client.query<{ id: number; name: string }>(
    `INSERT INTO routines (name, difficulty, trainer_id, member_selectable)
     VALUES ($1, $2, $3, false)
     RETURNING id, name`,
    [routineName, sourceRoutine.difficulty, trainerId]
  );
  const routineId = created.rows[0].id;

  try {
    await client.query(
      `INSERT INTO routine_exercises (
         routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription
       )
       SELECT $1, exercise_id, sets, reps, rest_seconds, weight_suggestion, set_prescription
       FROM routine_exercises WHERE routine_id = $2 ORDER BY id`,
      [routineId, sourceRoutineId]
    );
  } catch {
    await client.query(
      `INSERT INTO routine_exercises (
         routine_id, exercise_id, sets, reps, rest_seconds, weight_suggestion
       )
       SELECT $1, exercise_id, sets, reps, rest_seconds, weight_suggestion
       FROM routine_exercises WHERE routine_id = $2 ORDER BY id`,
      [routineId, sourceRoutineId]
    );
  }

  await client.query(
    `INSERT INTO user_routines (user_id, routine_id, assigned_by, start_date, end_date)
     VALUES ($1, $2, $1, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days')`,
    [memberId, routineId]
  );

  return created.rows[0];
}

export async function selfAssignTemplateRoutine(
  memberId: number,
  templateRoutineId: number
): Promise<{ routineId: number; routineName: string; templateName: string; trainerId: number }> {
  const gate = await memberCanSelectTemplate(memberId, templateRoutineId);
  if (!gate.ok) throw new Error(gate.reason);

  const template = await query<{ name: string }>('SELECT name FROM routines WHERE id = $1', [
    templateRoutineId,
  ]);
  const templateName = template.rows[0]?.name ?? 'Plantilla';

  const result = await withTransaction(async (client) => {
    const cloned = await cloneRoutineForMember(client, templateRoutineId, gate.trainerId, memberId);
    await ensureTrainerMemberAssignment(gate.trainerId, memberId, memberId);
    await client.query(
      `INSERT INTO member_daily_routine_choice (user_id, choice_date, routine_id, updated_at)
       VALUES ($1, CURRENT_DATE, $2, NOW())
       ON CONFLICT (user_id, choice_date) DO UPDATE
       SET routine_id = EXCLUDED.routine_id, updated_at = NOW()`,
      [memberId, cloned.id]
    );
    return cloned;
  });

  await recordMemberActivityEvent({
    memberId,
    trainerId: gate.trainerId,
    eventType: 'self_assigned_template',
    routineId: result.id,
    metadata: { template_routine_id: templateRoutineId, template_name: templateName },
  });

  return {
    routineId: result.id,
    routineName: result.name,
    templateName,
    trainerId: gate.trainerId,
  };
}

export async function recordMemberActivityEvent(input: {
  memberId: number;
  trainerId: number;
  eventType: MemberActivityEventType;
  routineId?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  return withMemberAgencyFallback(0, async () => {
    const { rows } = await query<{ id: number }>(
      `INSERT INTO member_activity_events (member_id, trainer_id, event_type, routine_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id`,
      [
        input.memberId,
        input.trainerId,
        input.eventType,
        input.routineId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
    return rows[0].id;
  });
}

export async function getTodayRoutineChoice(memberId: number): Promise<number | null> {
  return withMemberAgencyFallback(null, async () => {
    const { rows } = await query<{ routine_id: number }>(
      `SELECT routine_id FROM member_daily_routine_choice
       WHERE user_id = $1 AND choice_date = CURRENT_DATE`,
      [memberId]
    );
    return rows[0]?.routine_id ?? null;
  });
}

export async function setTodayRoutineChoice(memberId: number, routineId: number): Promise<void> {
  const assigned = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM user_routines WHERE user_id = $1 AND routine_id = $2`,
    [memberId, routineId]
  );
  if (!assigned.rows[0]) {
    throw new Error('Rutina no asignada');
  }
  await query(
    `INSERT INTO member_daily_routine_choice (user_id, choice_date, routine_id, updated_at)
     VALUES ($1, CURRENT_DATE, $2, NOW())
     ON CONFLICT (user_id, choice_date) DO UPDATE
     SET routine_id = EXCLUDED.routine_id, updated_at = NOW()`,
    [memberId, routineId]
  );
}

export async function listSelectableTemplates(memberId: number) {
  return withMemberAgencyFallback([], async () => {
    const trainerIds = await getMemberAssignedTrainerIds(memberId);
    const params: unknown[] = [memberId];
    let trainerFilter = '';
    if (trainerIds.length > 0) {
      trainerFilter = ` AND r.trainer_id = ANY($2::bigint[])`;
      params.push(trainerIds);
    }

    const { rows } = await query(
      `SELECT r.id, r.name, r.difficulty, r.trainer_id, u.full_name AS trainer_name,
            COALESCE(ec.exercise_count, 0)::int AS exercise_count,
            preview.exercise_preview,
            EXISTS (
              SELECT 1 FROM user_routines ur
              WHERE ur.user_id = $1
                AND ur.routine_id IN (
                  SELECT r2.id FROM routines r2
                  WHERE r2.name = r.name AND r2.trainer_id = r.trainer_id
                )
            ) AS already_started
     FROM routines r
     JOIN users u ON u.id = r.trainer_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS exercise_count FROM routine_exercises re WHERE re.routine_id = r.id
     ) ec ON true
     LEFT JOIN LATERAL (
       SELECT string_agg(e.name, ' · ') AS exercise_preview
       FROM (
         SELECT ex.name FROM routine_exercises re
         JOIN exercises ex ON ex.id = re.exercise_id
         WHERE re.routine_id = r.id ORDER BY re.id LIMIT 3
       ) e
     ) preview ON true
     WHERE r.member_selectable = true
       AND COALESCE(ec.exercise_count, 0) > 0
       ${trainerFilter}
     ORDER BY r.name ASC`,
      params
    );
    return rows;
  });
}

export async function listPendingMemberChoicesForTrainer(trainerId: number, limit = 20) {
  return withMemberAgencyFallback([], async () => {
    const { rows } = await query<MemberActivityEventRow>(
      `SELECT e.id, e.member_id, e.trainer_id, e.event_type, e.routine_id, e.metadata,
              e.created_at, e.acknowledged_at, u.full_name AS member_name
       FROM member_activity_events e
       JOIN users u ON u.id = e.member_id
       WHERE e.trainer_id = $1 AND e.acknowledged_at IS NULL
       ORDER BY e.created_at DESC
       LIMIT $2`,
      [trainerId, limit]
    );
    return rows;
  });
}
