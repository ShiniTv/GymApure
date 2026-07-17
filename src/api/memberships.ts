import { asyncRouter } from './middleware/asyncRouter.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { z } from 'zod';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import {
  assignSubscription,
  getActiveSubscriptionByUserId,
  pauseSubscription,
  resumeSubscription,
} from '../lib/subscriptions.ts';
import { withTransaction } from '../db/index.ts';
import { logAudit } from '../lib/audit.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { getExpiringSubscriptions, getLastDoorAlert } from '../lib/expiringSubscriptions.ts';
import { getExpiryAlertDays } from '../lib/gymSettings.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';

const router = asyncRouter();

const membershipSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(100),
  duration_days: z.coerce.number().int().positive('Duración inválida'),
  price_usd: z.coerce.number().positive('Precio inválido'),
});

router.get('/expiring', authorize(['admin']), async (req, res) => {
  const defaultDays = await getExpiryAlertDays();
  const days = Math.min(
    90,
    Math.max(1, parseInt(String(req.query.days ?? defaultDays), 10) || defaultDays)
  );

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

router.get('/', authorize(['admin', 'trainer', 'member', 'receptionist']), async (_req, res) => {
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

router.delete('/:id', authorize(['admin']), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const { rows: planRows } = await query<{ name: string }>(
      'SELECT name FROM memberships WHERE id = $1',
      [id]
    );
    if (!planRows[0]) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const active = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM subscriptions
       WHERE membership_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
      [id]
    );
    if (parseInt(active.rows[0].count, 10) > 0) {
      return res.status(400).json({
        error:
          'No se puede eliminar un plan con suscripciones activas. Espera a que venzan o reasigna a los miembros.',
      });
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM subscriptions WHERE membership_id = $1', [id]);
      await client.query('DELETE FROM memberships WHERE id = $1', [id]);
    });

    await logAudit(req.user!.id, 'membership.delete', {
      membership_id: id,
      name: planRows[0].name,
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const pgCode =
      err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (pgCode === '23503') {
      return res.status(400).json({
        error: 'No se puede eliminar el plan porque tiene suscripciones asociadas.',
      });
    }
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get(
  '/user/:userId',
  requireMemberAccess('userId', 'admin'),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: 'userId inválido' });
      return;
    }
    const sub = await getActiveSubscriptionByUserId({ query }, userId);
    res.json(sub ?? null);
  })
);

const assignSchema = z.object({
  membership_id: z.coerce.number().int().positive(),
  start_date: z.string().optional(),
  payment_id: z.coerce.number().int().positive().optional(),
});

const membershipOperationSchema = z.object({
  user_id: z.coerce.number().int().positive('user_id inválido'),
});

router.post('/pause', authorize(RECEPTION_STAFF), async (req: AuthRequest, res) => {
  const parsed = membershipOperationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const subscription = await withTransaction((client) =>
      pauseSubscription(client, parsed.data.user_id)
    );
    await logAudit(req.user!.id, 'membership.pause', {
      user_id: parsed.data.user_id,
      subscription_id: subscription.id,
      days_remaining: subscription.pause_days_remaining,
    });
    invalidateAdminStatsCache();
    res.json({ success: true, subscription });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(message.startsWith('No hay una membresía') ? 404 : 500).json({ error: message });
  }
});

router.post('/resume', authorize(RECEPTION_STAFF), async (req: AuthRequest, res) => {
  const parsed = membershipOperationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const subscription = await withTransaction((client) =>
      resumeSubscription(client, parsed.data.user_id)
    );
    await logAudit(req.user!.id, 'membership.resume', {
      user_id: parsed.data.user_id,
      subscription_id: subscription.id,
      days_remaining: subscription.days_remaining,
    });
    invalidateAdminStatsCache();
    res.json({ success: true, subscription });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(message.startsWith('No hay una membresía') ? 404 : 500).json({ error: message });
  }
});

router.post('/assign', authorize(RECEPTION_STAFF), async (req: AuthRequest, res) => {
  const userId = parseInt(String(req.body.user_id), 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'user_id inválido' });
  }

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  const isReceptionist = req.user!.role === 'receptionist';
  if (isReceptionist && !parsed.data.payment_id) {
    return res.status(400).json({
      error: 'Debe vincular un pago aprobado (payment_id). Registre y apruebe el pago primero.',
    });
  }

  try {
    const memberCheck = await query<{ role: string }>('SELECT role FROM users WHERE id = $1', [
      userId,
    ]);
    if (!memberCheck.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (memberCheck.rows[0].role !== 'member') {
      return res.status(400).json({ error: 'Solo se asigna membresía a miembros' });
    }

    if (parsed.data.payment_id) {
      const paymentResult = await query<{ user_id: number; status: string }>(
        'SELECT user_id, status FROM payments WHERE id = $1',
        [parsed.data.payment_id]
      );
      const payment = paymentResult.rows[0];
      if (!payment) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }
      if (payment.status !== 'approved') {
        return res.status(400).json({ error: 'El pago debe estar aprobado' });
      }
      if (Number(payment.user_id) !== userId) {
        return res.status(400).json({ error: 'El pago no corresponde a este miembro' });
      }
    }

    const result = await withTransaction(async (client) =>
      assignSubscription(client, userId, parsed.data.membership_id, parsed.data.start_date)
    );

    await logAudit(req.user!.id, 'membership.assign', {
      user_id: userId,
      membership_id: parsed.data.membership_id,
      payment_id: parsed.data.payment_id ?? null,
    });

    invalidateAdminStatsCache();
    res.status(201).json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
