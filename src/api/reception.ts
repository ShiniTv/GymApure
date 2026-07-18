import { asyncRouter } from './middleware/asyncRouter.ts';
import { query, withTransaction } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { logAudit } from '../lib/audit.ts';
import { cedulaWhereClause, normalizeCedulaInput } from '../lib/cedulaUtils.ts';
import { performCheckIn, performCheckOut } from './attendance/attendanceCore.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';
import { RECEPTION_OPERATORS } from '../lib/roles.ts';
import { walkInHandler } from './reception/walkIn.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { proofUpload } from '../lib/uploadStorage.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';
import { z } from 'zod';
import { assignSubscription } from '../lib/subscriptions.ts';
import { assertProofUpload } from '../lib/uploadValidation.ts';
import {
  finalizeLocalProof,
  isProofStorageRemote,
  uploadPaymentProof,
} from '../lib/proofStorage.ts';
import { BS_PAYMENT_METHODS, getActiveUsdRate, roundBsAmount } from '../lib/exchangeRate.ts';

const router = asyncRouter();

router.use(authorize(RECEPTION_OPERATORS));

const lookupQuerySchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
});

const checkBodySchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
});

const renewSchema = z.object({
  user_id: z.coerce.number().int().positive('Miembro inválido'),
  membership_id: z.coerce.number().int().positive('Plan inválido'),
  amount_usd: z.coerce.number().positive('Monto inválido'),
  method: z.string().trim().min(1, 'Método requerido').max(50),
  reference: z.string().trim().max(200).optional().nullable(),
});

router.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const parsed = lookupQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Cédula requerida', found: false });
      return;
    }

    const cedula = normalizeCedulaInput(parsed.data.cedula);

    const userResult = await query<{
      id: number;
      full_name: string;
      email: string;
      cedula: string | null;
      phone: string | null;
      status: string;
      role: string;
      profile_image: string | null;
      sub_id: number | null;
      membership_name: string | null;
      end_date: string | null;
      days_remaining: number | null;
      paused_sub_id: number | null;
      paused_membership_name: string | null;
      paused_end_date: string | null;
      pause_days_remaining: number | null;
      att_id: number | null;
      check_in_time: Date | string | null;
      check_out_time: Date | string | null;
      has_trainer_assignment: boolean;
      has_active_routine: boolean;
      has_class_booking: boolean;
    }>(
      `SELECT u.id, u.full_name, u.email, u.cedula, u.phone, u.status, u.role, u.profile_image,
              sub.id AS sub_id, sub.membership_name, sub.end_date, sub.days_remaining,
              paused_sub.id AS paused_sub_id, paused_sub.membership_name AS paused_membership_name,
              paused_sub.end_date AS paused_end_date, paused_sub.pause_days_remaining,
              att.id AS att_id, att.check_in_time, att.check_out_time,
              (
                EXISTS (
                  SELECT 1 FROM trainer_member_assignments tma
                  WHERE tma.member_id = u.id
                ) OR EXISTS (
                  SELECT 1 FROM user_routines ur
                  WHERE ur.user_id = u.id
                )
              ) AS has_trainer_assignment,
              EXISTS (
                SELECT 1 FROM user_routines ur
                WHERE ur.user_id = u.id
                  AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
                  AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
              ) AS has_active_routine,
              EXISTS (
                SELECT 1 FROM class_bookings cb
                WHERE cb.user_id = u.id
                  AND cb.status IN ('booked', 'attended')
              ) AS has_class_booking
       FROM users u
       LEFT JOIN LATERAL (
         SELECT s.id, m.name AS membership_name, s.end_date,
                GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
         FROM subscriptions s
         JOIN memberships m ON m.id = s.membership_id
         WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
         ORDER BY s.end_date DESC
         LIMIT 1
       ) sub ON true
       LEFT JOIN LATERAL (
         SELECT s.id, m.name AS membership_name, s.end_date, s.pause_days_remaining
         FROM subscriptions s
         JOIN memberships m ON m.id = s.membership_id
         WHERE s.user_id = u.id AND s.status = 'paused'
         ORDER BY s.paused_at DESC NULLS LAST, s.id DESC
         LIMIT 1
       ) paused_sub ON true
       LEFT JOIN LATERAL (
         SELECT a.id, a.check_in_time, a.check_out_time
         FROM attendance a
         WHERE a.user_id = u.id AND ${sqlTodayRange('a.check_in_time')}
         ORDER BY a.check_in_time DESC
         LIMIT 1
       ) att ON true
       WHERE ${cedulaWhereClause('u.cedula', 1)}
       LIMIT 1`,
      [cedula]
    );

    const row = userResult.rows[0];
    if (!row) {
      res.status(404).json({ error: 'Usuario no encontrado', found: false });
      return;
    }

    const activeSubscription =
      row.sub_id != null && row.membership_name && row.end_date
        ? {
            id: row.sub_id,
            membership_name: row.membership_name,
            end_date: row.end_date,
            days_remaining: row.days_remaining ?? 0,
            status: 'active' as const,
          }
        : null;

    const pausedSubscription =
      !activeSubscription && row.paused_sub_id != null && row.paused_membership_name
        ? {
            id: row.paused_sub_id,
            membership_name: row.paused_membership_name,
            end_date: row.paused_end_date,
            days_remaining: row.pause_days_remaining ?? 0,
            status: 'paused' as const,
          }
        : null;

    const subscription = activeSubscription ?? pausedSubscription;

    const todaySession =
      row.att_id != null && row.check_in_time
        ? {
            id: row.att_id,
            check_in_time: row.check_in_time,
            check_out_time: row.check_out_time,
          }
        : null;

    const isInside = todaySession ? todaySession.check_out_time == null : false;

    let accessStatus: 'allowed' | 'inactive' | 'no_subscription' | 'paused' = 'allowed';
    if (row.status !== 'active') accessStatus = 'inactive';
    else if (pausedSubscription) accessStatus = 'paused';
    else if (!activeSubscription) accessStatus = 'no_subscription';

    res.json({
      found: true,
      user: {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        cedula: row.cedula,
        phone: row.phone,
        status: row.status,
        role: row.role,
        profile_image: row.profile_image,
      },
      subscription,
      attendance: {
        is_inside: isInside,
        today_session: todaySession,
      },
      onboarding:
        row.role === 'member'
          ? {
              has_trainer_assignment: row.has_trainer_assignment,
              has_active_routine: row.has_active_routine,
              has_class_booking: row.has_class_booking,
            }
          : null,
      access_status: accessStatus,
      can_check_in: accessStatus === 'allowed' && !isInside,
      can_check_out: accessStatus === 'allowed' && isInside,
    });
  })
);

router.post(
  '/walk-in',
  uploadRateLimiter,
  proofUpload.single('proof'),
  asyncHandler(walkInHandler)
);

router.post(
  '/renew',
  uploadRateLimiter,
  proofUpload.single('proof'),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = renewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    const data = parsed.data;
    const userResult = await query<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE id = $1',
      [data.user_id]
    );
    if (!userResult.rows[0]) {
      res.status(404).json({ error: 'Miembro no encontrado' });
      return;
    }
    if (userResult.rows[0].role !== 'member') {
      res.status(400).json({ error: 'Solo se puede renovar la membresía de un socio' });
      return;
    }

    let amountBs: number | null = null;
    let exchangeRate: number | null = null;
    if (BS_PAYMENT_METHODS.has(data.method)) {
      const rate = await getActiveUsdRate();
      if (!rate) {
        res.status(503).json({ error: 'Tasa de cambio no disponible. Contacta al gimnasio.' });
        return;
      }
      exchangeRate = rate.rate;
      amountBs = roundBsAmount(data.amount_usd, rate.rate);
    }

    let result: { paymentId: number; subscription: Awaited<ReturnType<typeof assignSubscription>> };
    try {
      result = await withTransaction(async (client) => {
        const paymentResult = await client.query<{ id: number }>(
          `INSERT INTO payments
            (user_id, amount_usd, amount_bs, exchange_rate, method, reference, status, proof_url)
           VALUES ($1, $2, $3, $4, $5, $6, 'approved', NULL)
           RETURNING id`,
          [
            data.user_id,
            data.amount_usd,
            amountBs,
            exchangeRate,
            data.method,
            data.reference || null,
          ]
        );
        const paymentId = Number(paymentResult.rows[0].id);
        if (req.file) {
          assertProofUpload(req.file);
          const proofUrl = isProofStorageRemote()
            ? await uploadPaymentProof(req.file, data.user_id, paymentId)
            : await finalizeLocalProof(req.file);
          await client.query('UPDATE payments SET proof_url = $1 WHERE id = $2', [
            proofUrl,
            paymentId,
          ]);
        }
        const subscription = await assignSubscription(client, data.user_id, data.membership_id);
        return { paymentId, subscription };
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'No se pudo renovar' });
      return;
    }

    await logAudit(req.user!.id, 'reception.renew', {
      user_id: data.user_id,
      membership_id: data.membership_id,
      payment_id: result.paymentId,
      amount_usd: data.amount_usd,
    });
    res.status(201).json({ success: true, payment_id: result.paymentId, ...result.subscription });
  })
);

router.post(
  '/check-in',
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = checkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Cédula requerida' });
      return;
    }

    const cedula = normalizeCedulaInput(parsed.data.cedula) || parsed.data.cedula;
    const result = await performCheckIn(cedula);
    if (result.ok) {
      await logAudit(req.user!.id, 'reception.check_in', { cedula, ...result.body });
    }
    res.status(result.status).json(result.body);
  })
);

router.post(
  '/check-out',
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = checkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Cédula requerida' });
      return;
    }

    const cedula = normalizeCedulaInput(parsed.data.cedula) || parsed.data.cedula;
    const result = await performCheckOut(cedula);
    if (result.ok) {
      await logAudit(req.user!.id, 'reception.check_out', { cedula, ...result.body });
    }
    res.status(result.status).json(result.body);
  })
);

export default router;
