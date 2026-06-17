import type { RequestHandler } from 'express';
import { query } from '../../db/index.ts';
import { resolveKioskUser } from './kioskUser.ts';
import { invalidateAdminStatsCache } from '../../lib/adminStatsCache.ts';
import { sqlTodayRange } from '../../lib/sqlDateRanges.ts';

function normalizeCedula(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Public kiosk check-out (no JWT). Protected by X-Kiosk-Key + rate limit. */
export const checkOutHandler: RequestHandler = async (req, res) => {
  const cedula = normalizeCedula(req.body?.cedula);
  if (!cedula) {
    return res.status(400).json({ error: 'Cédula requerida' });
  }

  try {
    const resolved = await resolveKioskUser(cedula);
    if (resolved.ok === false) {
      return res.status(resolved.status).json({
        error: resolved.error,
        ...(resolved.user_name ? { user_name: resolved.user_name } : {}),
      });
    }

    const { user } = resolved;

    const openSession = await query<{ id: number; check_in_time: Date | string }>(
      `SELECT id, check_in_time FROM attendance
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
        return res.json({
          success: true,
          user_name: user.full_name,
          already_checked_out: true,
          message: 'Ya registraste tu salida hoy',
          days_remaining: user.days_remaining,
          expiry_warning: user.expiry_warning,
        });
      }

      return res.status(400).json({
        error: 'No tienes un ingreso activo hoy',
        user_name: user.full_name,
      });
    }

    const sessionId = openSession.rows[0].id;
    const durationResult = await query<{ minutes: string }>(
      `UPDATE attendance SET check_out_time = NOW() WHERE id = $1
       RETURNING GREATEST(1, ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60))::text AS minutes`,
      [sessionId]
    );

    const durationMinutes = parseInt(durationResult.rows[0]?.minutes || '1', 10);

    invalidateAdminStatsCache();

    res.json({
      success: true,
      user_name: user.full_name,
      duration_minutes: durationMinutes,
      duration_label: formatDuration(durationMinutes),
      message: `Salida registrada. Tiempo en gym: ${formatDuration(durationMinutes)}`,
      days_remaining: user.days_remaining,
      expiry_warning: user.expiry_warning,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};
