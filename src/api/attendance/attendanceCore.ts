import { query } from '../../db/index.ts';
import { invalidateAdminStatsCache } from '../../lib/adminStatsCache.ts';
import { sqlTodayRange } from '../../lib/sqlDateRanges.ts';
import { resolveKioskUser } from './kioskUser.ts';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export type AttendanceActionResult =
  | { ok: true; status: number; body: Record<string, unknown> }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function performCheckIn(cedula: string): Promise<AttendanceActionResult> {
  const resolved = await resolveKioskUser(cedula);
  if (resolved.ok === false) {
    return {
      ok: false,
      status: resolved.status,
      body: {
        error: resolved.error,
        ...(resolved.user_name ? { user_name: resolved.user_name } : {}),
      },
    };
  }

  const { user } = resolved;

  const openSession = await query(
    `SELECT id FROM attendance
     WHERE user_id = $1 AND ${sqlTodayRange('check_in_time')} AND check_out_time IS NULL
     LIMIT 1`,
    [user.id]
  );

  if (openSession.rows[0]) {
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        user_name: user.full_name,
        already_checked_in: true,
        message: 'Ya tiene un ingreso activo hoy',
        days_remaining: user.days_remaining,
        expiry_warning: user.expiry_warning,
      },
    };
  }

  await query('INSERT INTO attendance (user_id) VALUES ($1)', [user.id]);
  invalidateAdminStatsCache();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      user_name: user.full_name,
      days_remaining: user.days_remaining,
      expiry_warning: user.expiry_warning,
    },
  };
}

export async function performCheckOut(cedula: string): Promise<AttendanceActionResult> {
  const resolved = await resolveKioskUser(cedula);
  if (resolved.ok === false) {
    return {
      ok: false,
      status: resolved.status,
      body: {
        error: resolved.error,
        ...(resolved.user_name ? { user_name: resolved.user_name } : {}),
      },
    };
  }

  const { user } = resolved;

  const openSession = await query<{ id: number }>(
    `SELECT id FROM attendance
     WHERE user_id = $1 AND ${sqlTodayRange('check_in_time')} AND check_out_time IS NULL
     ORDER BY check_in_time DESC
     LIMIT 1`,
    [user.id]
  );

  if (!openSession.rows[0]) {
    const closedToday = await query(
      `SELECT id FROM attendance
       WHERE user_id = $1 AND ${sqlTodayRange('check_in_time')} AND check_out_time IS NOT NULL
       LIMIT 1`,
      [user.id]
    );

    if (closedToday.rows[0]) {
      return {
        ok: true,
        status: 200,
        body: {
          success: true,
          user_name: user.full_name,
          already_checked_out: true,
          message: 'Ya registró su salida hoy',
          days_remaining: user.days_remaining,
          expiry_warning: user.expiry_warning,
        },
      };
    }

    return {
      ok: false,
      status: 400,
      body: {
        error: 'No tiene un ingreso activo hoy',
        user_name: user.full_name,
      },
    };
  }

  const sessionId = openSession.rows[0].id;
  const durationResult = await query<{ minutes: string }>(
    `UPDATE attendance SET check_out_time = NOW() WHERE id = $1
     RETURNING GREATEST(1, ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60))::text AS minutes`,
    [sessionId]
  );

  const durationMinutes = parseInt(durationResult.rows[0]?.minutes || '1', 10);
  invalidateAdminStatsCache();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      user_name: user.full_name,
      duration_minutes: durationMinutes,
      duration_label: formatDuration(durationMinutes),
      message: `Salida registrada. Tiempo en gym: ${formatDuration(durationMinutes)}`,
      days_remaining: user.days_remaining,
      expiry_warning: user.expiry_warning,
    },
  };
}
