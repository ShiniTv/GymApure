import {
  activeSubscriptionLateralSql,
  pausedSubscriptionLateralSql,
} from '../../lib/subscriptions.ts';
import { parseBooleanQuery, parseSearchQuery } from '../../lib/pagination.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from '../../lib/sqlLike.ts';
import { isTrainingShift } from '../../lib/trainingShift.ts';

export const USER_LIST_FROM = `
  FROM users u
  LEFT JOIN LATERAL (
    SELECT MAX(end_time) AS last_workout
    FROM workout_sessions ws
    WHERE ws.user_id = u.id
  ) lw ON true
  ${activeSubscriptionLateralSql()}
  ${pausedSubscriptionLateralSql()}
`;

/** COUNT does not need workout/paused laterals; only active sub when filtering expiring. */
export function userCountFromSql(expiringOnly: boolean): string {
  if (expiringOnly) {
    return `FROM users u
  ${activeSubscriptionLateralSql()}`;
  }
  return `FROM users u`;
}

export function buildUserListFilters(
  query: Record<string, unknown>,
  alertDays: number,
  options?: { trainerId?: number; membersOnly?: boolean; activeOnly?: boolean }
): { whereSql: string; params: unknown[] } {
  const search = parseSearchQuery(query);
  const role = typeof query.role === 'string' ? query.role.trim() : '';
  const expiringOnly = parseBooleanQuery(query.expiring);
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (search) {
    const pattern = toLikeContainsPattern(search);
    if (pattern) {
      params.push(pattern);
      const idx = params.length;
      conditions.push(
        `(LOWER(u.full_name) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(COALESCE(u.cedula, '')) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(u.email) LIKE $${idx}${LIKE_ESCAPE_CLAUSE})`
      );
    }
  }

  if (role && ['admin', 'trainer', 'member', 'receptionist'].includes(role)) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (options?.membersOnly) conditions.push(`u.role = 'member'`);
  if (options?.activeOnly) conditions.push(`u.status = 'active'`);

  if (options?.trainerId) {
    params.push(options.trainerId);
    conditions.push(`u.id IN (
      SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $${params.length}
      UNION
      SELECT DISTINCT ur.user_id FROM user_routines ur
      JOIN routines r ON r.id = ur.routine_id
      WHERE r.trainer_id = $${params.length}
    )`);
  }

  if (expiringOnly) {
    params.push(alertDays);
    conditions.push(
      `u.role = 'member' AND sub.days_remaining IS NOT NULL AND sub.days_remaining <= $${params.length}`
    );
  }

  const shiftFilter = typeof query.shift === 'string' ? query.shift.trim() : '';
  if (shiftFilter && isTrainingShift(shiftFilter)) {
    params.push(shiftFilter);
    conditions.push(`u.training_shift = $${params.length}`);
  }

  const ids = parseUserIdsQuery(query.ids);
  if (ids.length > 0) {
    params.push(ids);
    conditions.push(`u.id = ANY($${params.length}::bigint[])`);
  }

  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

const MAX_USER_IDS_FILTER = 50;

export function parseUserIdsQuery(raw: unknown): number[] {
  const text = Array.isArray(raw) ? raw.join(',') : typeof raw === 'string' ? raw : '';
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const part of text.split(',')) {
    const id = Number(part.trim());
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_USER_IDS_FILTER) break;
  }
  return ids;
}
