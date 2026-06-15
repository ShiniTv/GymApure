import type { RequestHandler } from 'express';
import { query } from '../../db/index.ts';
import { resolveKioskUser } from './kioskUser.ts';

function normalizeCedula(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Public kiosk check-in (no JWT). Protected by X-Kiosk-Key + rate limit. */
export const checkInHandler: RequestHandler = async (req, res) => {
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

    const openSession = await query(
      `SELECT id FROM attendance
       WHERE user_id = $1 AND check_in_time::date = CURRENT_DATE AND check_out_time IS NULL
       LIMIT 1`,
      [user.id]
    );

    if (openSession.rows[0]) {
      return res.json({
        success: true,
        user_name: user.full_name,
        already_checked_in: true,
        message: 'Ya tienes un ingreso activo hoy',
        days_remaining: user.days_remaining,
        expiry_warning: user.expiry_warning,
      });
    }

    await query('INSERT INTO attendance (user_id) VALUES ($1)', [user.id]);
    res.json({
      success: true,
      user_name: user.full_name,
      days_remaining: user.days_remaining,
      expiry_warning: user.expiry_warning,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};
