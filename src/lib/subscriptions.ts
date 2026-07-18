export interface ActiveSubscription {
  id: number;
  membership_name: string;
  end_date: string;
  days_remaining: number;
  start_date?: string;
  status?: string;
  duration_days?: number;
  price_usd?: number;
}

export interface PausedSubscription extends ActiveSubscription {
  paused_at: string;
  pause_days_remaining: number;
  pause_reason?: string | null;
}

interface Queryable {
  query: <T extends import('pg').QueryResultRow = import('pg').QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<import('pg').QueryResult<T>>;
}

/** Fetch the active subscription + membership details for a given user. */
export async function getActiveSubscriptionByUserId(
  db: Queryable,
  userId: number
): Promise<ActiveSubscription | null> {
  const { rows } = await db.query<{
    id: number;
    membership_name: string;
    end_date: string;
    days_remaining: number;
    start_date?: string;
    status?: string;
    duration_days?: number;
    price_usd?: number;
  }>(
    `SELECT s.id, m.name AS membership_name, s.end_date,
            GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining,
            s.start_date, s.status, m.duration_days, m.price_usd
     FROM subscriptions s
     JOIN memberships m ON m.id = s.membership_id
     WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date >= CURRENT_DATE
     ORDER BY s.end_date DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

/** SQL fragment for a LATERAL JOIN that fetches a user's active subscription. */
export function activeSubscriptionLateralSql(): string {
  return `LEFT JOIN LATERAL (
    SELECT m.name AS membership_name, s.end_date,
           GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining,
           s.start_date, m.duration_days, m.price_usd
    FROM subscriptions s
    JOIN memberships m ON m.id = s.membership_id
    WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
    ORDER BY s.end_date DESC
    LIMIT 1
  ) sub ON true`;
}

/** SQL fragment for a paused subscription. It is deliberately separate from active membership. */
export function pausedSubscriptionLateralSql(): string {
  return `LEFT JOIN LATERAL (
    SELECT m.name AS membership_name, s.end_date, s.pause_days_remaining, s.paused_at
    FROM subscriptions s
    JOIN memberships m ON m.id = s.membership_id
    WHERE s.user_id = u.id AND s.status = 'paused'
    ORDER BY s.paused_at DESC NULLS LAST, s.id DESC
    LIMIT 1
  ) paused_sub ON true`;
}

export function computeSubscriptionDates(
  durationDays: number,
  activeEndDate?: string | Date | null,
  startDateOverride?: string
): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start = new Date(today);

  if (startDateOverride) {
    start = new Date(startDateOverride);
    start.setHours(0, 0, 0, 0);
  } else if (activeEndDate) {
    const previousEnd = new Date(activeEndDate);
    previousEnd.setHours(0, 0, 0, 0);
    if (previousEnd >= today) {
      start = previousEnd;
    }
  }

  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export async function assignSubscription(
  client: Queryable,
  userId: number,
  membershipId: number,
  startDateOverride?: string
) {
  const membershipResult = await client.query<{ id: number; duration_days: number }>(
    'SELECT id, duration_days FROM memberships WHERE id = $1',
    [membershipId]
  );
  const membership = membershipResult.rows[0];
  if (!membership) {
    throw new Error('Plan de membresía no encontrado');
  }

  const activeSubResult = await client.query<{ end_date: Date | string }>(
    `SELECT end_date FROM subscriptions
     WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
     ORDER BY end_date DESC LIMIT 1`,
    [userId]
  );

  const { startDate, endDate } = computeSubscriptionDates(
    membership.duration_days,
    activeSubResult.rows[0]?.end_date ?? null,
    startDateOverride
  );

  await client.query(
    `UPDATE subscriptions SET status = 'expired'
     WHERE user_id = $1
       AND (
         (status = 'active' AND end_date >= CURRENT_DATE)
         OR status = 'paused'
       )`,
    [userId]
  );

  await client.query(
    `INSERT INTO subscriptions (user_id, membership_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, 'active')`,
    [userId, membershipId, startDate, endDate]
  );

  return { startDate, endDate, membershipId };
}

/** Pause a current subscription while preserving its unused days. */
export async function pauseSubscription(
  client: Queryable,
  userId: number,
  reason: string
): Promise<PausedSubscription> {
  const { rows } = await client.query<PausedSubscription>(
    `UPDATE subscriptions s
     SET status = 'paused',
         paused_at = NOW(),
         pause_days_remaining = GREATEST(0, s.end_date - CURRENT_DATE),
         pause_reason = $2,
         resume_at = NULL
     FROM memberships m
     WHERE s.user_id = $1
       AND s.membership_id = m.id
       AND s.status = 'active'
       AND s.end_date >= CURRENT_DATE
     RETURNING s.id, m.name AS membership_name, s.end_date,
               GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining,
               s.start_date, s.status, m.duration_days, m.price_usd,
               s.paused_at, s.pause_days_remaining, s.pause_reason`,
    [userId, reason]
  );
  if (!rows[0]) throw new Error('No hay una membresía activa para pausar');
  return rows[0];
}

/** Resume a paused subscription, restarting its remaining days today. */
export async function resumeSubscription(
  client: Queryable,
  userId: number
): Promise<ActiveSubscription> {
  const { rows } = await client.query<ActiveSubscription>(
    `UPDATE subscriptions s
     SET status = 'active',
         end_date = CURRENT_DATE + COALESCE(s.pause_days_remaining, 0),
         resume_at = NOW(),
         paused_at = NULL,
         pause_days_remaining = NULL,
         pause_reason = NULL
     FROM memberships m
     WHERE s.user_id = $1
       AND s.membership_id = m.id
       AND s.status = 'paused'
     RETURNING s.id, m.name AS membership_name, s.end_date,
               GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining,
               s.start_date, s.status, m.duration_days, m.price_usd`,
    [userId]
  );
  if (!rows[0]) throw new Error('No hay una membresía pausada para reanudar');
  return rows[0];
}
