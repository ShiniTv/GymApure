import { query } from '../db/index.ts';

export const DEFAULT_EXPIRY_ALERT_DAYS = 7;

export interface ExpiringSubscription {
  user_id: number;
  full_name: string;
  cedula: string | null;
  membership_name: string;
  end_date: string;
  days_remaining: number;
}

const EXPIRING_FROM = `
  FROM users u
  JOIN subscriptions s ON s.user_id = u.id
  JOIN memberships m ON m.id = s.membership_id
  WHERE u.role = 'member'
    AND u.status = 'active'
    AND s.status = 'active'
    AND s.end_date >= CURRENT_DATE
    AND s.end_date <= CURRENT_DATE + $1::int
`;

export async function markExpiredSubscriptions(): Promise<number> {
  const result = await query(
    `UPDATE subscriptions SET status = 'expired'
     WHERE status = 'active' AND end_date < CURRENT_DATE`
  );
  return result.rowCount ?? 0;
}

export async function getExpiringSubscriptions(days = DEFAULT_EXPIRY_ALERT_DAYS): Promise<ExpiringSubscription[]> {
  const { rows } = await query<ExpiringSubscription>(
    `SELECT DISTINCT ON (u.id)
      u.id AS user_id,
      u.full_name,
      u.cedula,
      m.name AS membership_name,
      s.end_date::text AS end_date,
      GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
     ${EXPIRING_FROM}
     ORDER BY u.id, s.end_date ASC`,
    [days]
  );
  return rows.sort((a, b) => a.days_remaining - b.days_remaining || a.full_name.localeCompare(b.full_name));
}

export async function getExpiringCount(days = DEFAULT_EXPIRY_ALERT_DAYS): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT u.id)::text AS count ${EXPIRING_FROM}`,
    [days]
  );
  return parseInt(rows[0]?.count || '0', 10);
}

export async function getExpiredThisWeekCount(): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id)::text AS count FROM subscriptions
     WHERE end_date >= DATE_TRUNC('week', CURRENT_DATE)
       AND end_date < CURRENT_DATE
       AND status IN ('active', 'expired')`
  );
  return parseInt(rows[0]?.count || '0', 10);
}

export interface LastDoorAlert {
  full_name: string;
  membership_name: string;
  days_remaining: number;
  check_in_time: string;
}

export async function getLastDoorAlert(days = DEFAULT_EXPIRY_ALERT_DAYS): Promise<LastDoorAlert | null> {
  const { rows } = await query<LastDoorAlert>(
    `SELECT u.full_name, m.name AS membership_name,
            GREATEST(0, s.end_date - a.check_in_time::date)::int AS days_remaining,
            a.check_in_time::text AS check_in_time
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     JOIN subscriptions s ON s.user_id = u.id
       AND s.status = 'active'
       AND s.end_date >= a.check_in_time::date
     JOIN memberships m ON m.id = s.membership_id
     WHERE GREATEST(0, s.end_date - a.check_in_time::date) <= $1
     ORDER BY a.check_in_time DESC
     LIMIT 1`,
    [days]
  );
  return rows[0] ?? null;
}

export function buildExpiryWarning(daysRemaining: number, alertDays = DEFAULT_EXPIRY_ALERT_DAYS): string | null {
  if (daysRemaining <= 0) return 'Membresía vence hoy';
  if (daysRemaining === 1) return 'Membresía vence mañana';
  if (daysRemaining <= alertDays) {
    return `Membresía vence en ${daysRemaining} días`;
  }
  return null;
}
