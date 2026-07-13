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

/** True when the member has at least one routine assigned by this trainer. */
export async function trainerHasMemberAccess(
  trainerId: number,
  memberId: number
): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM user_routines ur
     JOIN routines r ON r.id = ur.routine_id
     WHERE ur.user_id = $1 AND r.trainer_id = $2
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
