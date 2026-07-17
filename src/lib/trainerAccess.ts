import { query } from '../db/index.ts';

/** True when the routine exists and belongs to this trainer. */
export async function trainerOwnsRoutine(trainerId: number, routineId: number): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM routines WHERE id = $1 AND trainer_id = $2 LIMIT 1`,
    [routineId, trainerId]
  );
  return rows.length > 0;
}

/** True when the user exists, is an active member. */
export async function isActiveMember(memberId: number): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM users WHERE id = $1 AND role = 'member' AND status = 'active' LIMIT 1`,
    [memberId]
  );
  return rows.length > 0;
}

/**
 * True when the trainer may access the member:
 * explicit assignment OR at least one routine assigned by this trainer.
 */
export async function trainerHasMemberAccess(
  trainerId: number,
  memberId: number
): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok WHERE EXISTS (
       SELECT 1 FROM trainer_member_assignments
       WHERE trainer_id = $2 AND member_id = $1
     ) OR EXISTS (
       SELECT 1 FROM user_routines ur
       JOIN routines r ON r.id = ur.routine_id
       WHERE ur.user_id = $1 AND r.trainer_id = $2
     )
     LIMIT 1`,
    [memberId, trainerId]
  );
  return rows.length > 0;
}

/** True when the member has the routine assigned and it belongs to the trainer. */
export async function trainerHasMemberRoutineAccess(
  trainerId: number,
  memberId: number,
  routineId: number | string
): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM user_routines ur
     JOIN routines r ON r.id = ur.routine_id
     WHERE ur.user_id = $1 AND ur.routine_id = $2 AND r.trainer_id = $3
     LIMIT 1`,
    [memberId, routineId, trainerId]
  );
  return rows.length > 0;
}

/** Upsert explicit trainer–member link (idempotent). */
export async function ensureTrainerMemberAssignment(
  trainerId: number,
  memberId: number,
  assignedBy?: number | null
): Promise<void> {
  await query(
    `INSERT INTO trainer_member_assignments (trainer_id, member_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (trainer_id, member_id) DO NOTHING`,
    [trainerId, memberId, assignedBy ?? null]
  );
}
