import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireSelfOrRoles } from './middleware/access.ts';
import { assignSubscription } from '../lib/subscriptions.ts';
import { withTransaction } from '../db/index.ts';
import { logAudit } from '../lib/audit.ts';
import {
  getExpiringSubscriptions,
  getLastDoorAlert,
} from '../lib/expiringSubscriptions.ts';
import { getExpiryAlertDays } from '../lib/gymSettings.ts';

const router = Router();

const membershipSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(100),
  duration_days: z.coerce.number().int().positive('Duración inválida'),
  price_usd: z.coerce.number().positive('Precio inválido'),
});

router.get('/expiring', authorize(['admin']), async (req, res) => {
  const defaultDays = await getExpiryAlertDays();
  const days = Math.min(90, Math.max(1, parseInt(String(req.query.days ?? defaultDays), 10) || defaultDays));

  try {
    const [expiring, lastDoorAlert] = await Promise.all([
      getExpiringSubscriptions(days),
      getLastDoorAlert(days),
    ]);
    res.json({ days, expiring, lastDoorAlert });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/', authorize(['admin', 'trainer', 'member']), async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM memberships ORDER BY price_usd ASC');
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/', authorize(['admin']), async (req, res) => {
  const parsed = membershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  const { name, duration_days, price_usd } = parsed.data;

  try {
    const { rows } = await query(
      `INSERT INTO memberships (name, duration_days, price_usd)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, duration_days, price_usd]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/:id', authorize(['admin']), async (req, res) => {
  const parsed = membershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  const { name, duration_days, price_usd } = parsed.data;

  try {
    const { rows } = await query(
      `UPDATE memberships SET name = $1, duration_days = $2, price_usd = $3
       WHERE id = $4
       RETURNING *`,
      [name, duration_days, price_usd, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json(rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const active = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM subscriptions
       WHERE membership_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
      [req.params.id]
    );
    if (parseInt(active.rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar un plan con suscripciones activas',
      });
    }

    const { rowCount } = await query('DELETE FROM memberships WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/user/:userId', requireSelfOrRoles('userId', 'admin', 'trainer'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.start_date, s.end_date, s.status,
              m.name AS membership_name, m.duration_days, m.price_usd,
              GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
       FROM subscriptions s
       JOIN memberships m ON m.id = s.membership_id
       WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date >= CURRENT_DATE
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [req.params.userId]
    );
    res.json(rows[0] ?? null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

const assignSchema = z.object({
  membership_id: z.coerce.number().int().positive(),
  start_date: z.string().optional(),
});

router.post('/assign', authorize(['admin']), async (req: AuthRequest, res) => {
  const userId = parseInt(String(req.body.user_id), 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'user_id inválido' });
  }

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const memberCheck = await query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );
    if (!memberCheck.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (memberCheck.rows[0].role !== 'member') {
      return res.status(400).json({ error: 'Solo se asigna membresía a miembros' });
    }

    const result = await withTransaction(async (client) =>
      assignSubscription(client, userId, parsed.data.membership_id, parsed.data.start_date)
    );

    await logAudit(req.user!.id, 'membership.assign', {
      user_id: userId,
      membership_id: parsed.data.membership_id,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
