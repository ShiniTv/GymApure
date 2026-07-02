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

type Queryable = {
  query: <T extends import('pg').QueryResultRow = import('pg').QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<import('pg').QueryResult<T>>;
};

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
     WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
    [userId]
  );

  await client.query(
    `INSERT INTO subscriptions (user_id, membership_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, 'active')`,
    [userId, membershipId, startDate, endDate]
  );

  return { startDate, endDate, membershipId };
}
