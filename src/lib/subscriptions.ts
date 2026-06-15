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

type Queryable = {
  query: <T extends import('pg').QueryResultRow = import('pg').QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<import('pg').QueryResult<T>>;
};

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
