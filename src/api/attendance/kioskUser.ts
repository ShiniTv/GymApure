import { query } from '../../db/index.ts';
import { buildExpiryWarning } from '../../lib/expiringSubscriptions.ts';
import { getExpiryAlertDays } from '../../lib/gymSettings.ts';
import { cedulaWhereClause } from '../../lib/cedulaUtils.ts';

export interface KioskUserContext {
  id: number;
  full_name: string;
  days_remaining: number;
  expiry_warning: string | null;
}

type KioskError = {
  ok: false;
  status: number;
  error: string;
  user_name?: string;
};

type KioskSuccess = { ok: true; user: KioskUserContext };

export async function resolveKioskUser(cedula: string): Promise<KioskSuccess | KioskError> {
  const userResult = await query<{ id: number; full_name: string; status: string }>(
    `SELECT id, full_name, status FROM users WHERE ${cedulaWhereClause('cedula', 1)}`,
    [cedula]
  );
  const user = userResult.rows[0];

  if (!user) {
    return { ok: false, status: 404, error: 'Usuario no encontrado' };
  }

  if (user.status !== 'active') {
    return { ok: false, status: 403, error: 'Cuenta inactiva', user_name: user.full_name };
  }

  const subResult = await query<{ id: number; days_remaining: number }>(
    `SELECT id, GREATEST(0, end_date - CURRENT_DATE)::int AS days_remaining
     FROM subscriptions
     WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
     ORDER BY end_date DESC
     LIMIT 1`,
    [user.id]
  );

  const subscription = subResult.rows[0];
  if (!subscription) {
    return { ok: false, status: 403, error: 'Sin membresía activa', user_name: user.full_name };
  }

  const alertDays = await getExpiryAlertDays();
  const expiryWarning = buildExpiryWarning(subscription.days_remaining, alertDays);

  return {
    ok: true,
    user: {
      id: user.id,
      full_name: user.full_name,
      days_remaining: subscription.days_remaining,
      expiry_warning: expiryWarning,
    },
  };
}
