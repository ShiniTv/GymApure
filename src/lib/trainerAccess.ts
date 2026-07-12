import { query } from '../db/index.ts';

/** True when the target is an active member (trainers may coach before first assignment). */
export async function trainerCanCoachMember(_trainerId: number, memberId: number): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM users u
     WHERE u.id = $1 AND u.role = 'member' AND u.status = 'active'
     LIMIT 1`,
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
