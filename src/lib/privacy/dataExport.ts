import { query } from '../../db/index.ts';

export interface DataExportPayload {
  exported_at: string;
  subject_user_id: number;
  profile: Record<string, unknown> | null;
  subscriptions: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  measurements: Record<string, unknown>[];
  health_profile: Record<string, unknown> | null;
  routines: Record<string, unknown>[];
  workout_sessions: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  coach_notes: Record<string, unknown>[];
}

/**
 * Builds a JSON-serializable export of personal data for the authenticated user.
 * Omits password hashes, MFA secrets, and raw payment proof bytes.
 */
export async function buildUserDataExport(userId: number): Promise<DataExportPayload> {
  const { rows: profileRows } = await query<Record<string, unknown>>(
    `SELECT id, email, role, full_name, cedula, phone, dob, initial_weight, height, goal,
            profile_image, status, created_at, training_shift, weekly_training_goal, mfa_enabled
     FROM users WHERE id = $1`,
    [userId]
  );

  const { rows: subscriptions } = await query<Record<string, unknown>>(
    `SELECT id, membership_id, start_date, end_date, status, pause_reason, created_at
     FROM subscriptions WHERE user_id = $1 ORDER BY id`,
    [userId]
  );

  const { rows: payments } = await query<Record<string, unknown>>(
    `SELECT id, amount_usd, amount_bs, exchange_rate, method, reference, status,
            rejection_reason, created_at
     FROM payments WHERE user_id = $1 ORDER BY id`,
    [userId]
  );

  const { rows: attendance } = await query<Record<string, unknown>>(
    `SELECT id, check_in_time, check_out_time, created_at
     FROM attendance WHERE user_id = $1 ORDER BY id DESC LIMIT 500`,
    [userId]
  );

  const { rows: measurements } = await query<Record<string, unknown>>(
    `SELECT id, date, weight, body_fat_percentage, waist, arm, leg, created_at
     FROM user_measurements WHERE user_id = $1 ORDER BY date DESC, id DESC`,
    [userId]
  );

  const { rows: healthRows } = await query<Record<string, unknown>>(
    `SELECT condition_flags, conditions_notes, limitations_notes, allergies_notes,
            medications_notes, sex, activity_level, bmr_kcal, tdee_kcal, weight_used_kg,
            health_consent_at, health_consent_version, health_consent_policy_at,
            metabolic_computed_at, updated_at
     FROM member_health_profiles WHERE user_id = $1`,
    [userId]
  );

  const { rows: routines } = await query<Record<string, unknown>>(
    `SELECT ur.id, ur.routine_id, ur.assigned_at, ur.scheduled_weekdays, r.name AS routine_name
     FROM user_routines ur
     LEFT JOIN routines r ON r.id = ur.routine_id
     WHERE ur.user_id = $1
     ORDER BY ur.id`,
    [userId]
  );

  const { rows: workoutSessions } = await query<Record<string, unknown>>(
    `SELECT id, routine_id, start_time, end_time, success, created_at
     FROM workout_sessions WHERE user_id = $1 ORDER BY id DESC LIMIT 200`,
    [userId]
  );

  const { rows: notifications } = await query<Record<string, unknown>>(
    `SELECT id, type, title, body, read_at, created_at
     FROM user_notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 200`,
    [userId]
  );

  const { rows: coachNotes } = await query<Record<string, unknown>>(
    `SELECT id, body, author_id, created_at, updated_at
     FROM coach_notes WHERE member_id = $1 ORDER BY id DESC LIMIT 100`,
    [userId]
  );

  return {
    exported_at: new Date().toISOString(),
    subject_user_id: userId,
    profile: profileRows[0] ?? null,
    subscriptions,
    payments,
    attendance,
    measurements,
    health_profile: healthRows[0] ?? null,
    routines,
    workout_sessions: workoutSessions,
    notifications,
    coach_notes: coachNotes,
  };
}
