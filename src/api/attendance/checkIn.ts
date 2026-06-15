import type { RequestHandler } from 'express';
import { query } from '../../db/index.ts';

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
    const userResult = await query<{ id: number; full_name: string; status: string }>(
      'SELECT id, full_name, status FROM users WHERE cedula = $1',
      [cedula]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Cuenta inactiva', user_name: user.full_name });
    }

    const subResult = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
       LIMIT 1`,
      [user.id]
    );

    if (!subResult.rows[0]) {
      return res.status(403).json({
        error: 'Sin membresía activa',
        user_name: user.full_name,
      });
    }

    const todayCheckIn = await query(
      `SELECT id FROM attendance
       WHERE user_id = $1 AND check_in_time::date = CURRENT_DATE
       LIMIT 1`,
      [user.id]
    );

    if (todayCheckIn.rows[0]) {
      return res.json({
        success: true,
        user_name: user.full_name,
        already_checked_in: true,
        message: 'Ya registraste tu ingreso hoy',
      });
    }

    await query('INSERT INTO attendance (user_id) VALUES ($1)', [user.id]);
    res.json({ success: true, user_name: user.full_name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};
