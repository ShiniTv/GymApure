import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { assignSubscription } from '../lib/subscriptions.ts';
import { logAudit } from '../lib/audit.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import { AppError } from './middleware/errorHandler.ts';
import { proofUpload } from '../lib/uploadStorage.ts';
import { assertProofUpload } from '../lib/uploadValidation.ts';
import {
  isProofStorageRemote,
  finalizeLocalProof,
  streamPaymentProof,
  uploadPaymentProof,
} from '../lib/proofStorage.ts';
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyPaymentReported,
} from '../lib/chat/eventMessages.ts';
import { sendEmail, paymentApprovedEmail, paymentRejectedEmail } from '../lib/email.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { BS_PAYMENT_METHODS, getActiveUsdRate, roundBsAmount } from '../lib/exchangeRate.ts';
import { parsePaginationQuery, parseSearchQuery, type PaginatedResult } from '../lib/pagination.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from '../lib/sqlLike.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';

const router = asyncRouter();

const paymentReportSchema = z.object({
  amount_usd: z.coerce.number().positive('Monto USD inválido'),
  amount_bs: z.coerce.number().optional().nullable(),
  exchange_rate: z.coerce.number().optional().nullable(),
  method: z.string().trim().min(1, 'Método requerido').max(50),
  reference: z.string().trim().max(200).optional().nullable(),
  user_id: z.coerce.number().int().positive().optional(),
});

router.get('/', authorize(['admin', 'member', 'receptionist']), async (req: AuthRequest, res) => {
  const user = req.user!;
  const { page, pageSize, offset } = parsePaginationQuery(req.query, {
    pageSize: user.role === 'member' ? 10 : 20,
  });
  const search = parseSearchQuery(req.query);
  const status =
    typeof req.query.status === 'string' &&
    ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? req.query.status
      : '';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user.role === 'member') {
    params.push(user.id);
    conditions.push(`p.user_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  if (search && (user.role === 'admin' || user.role === 'receptionist')) {
    const pattern = toLikeContainsPattern(search);
    if (pattern) {
      params.push(pattern);
      const idx = params.length;
      conditions.push(
        `(LOWER(u.full_name) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(COALESCE(p.reference, '')) LIKE $${idx}${LIKE_ESCAPE_CLAUSE})`
      );
    }
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];
  const listParams = [...params, pageSize, offset];

  try {
    const [countResult, listResult] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM payments p
         JOIN users u ON p.user_id = u.id
         ${whereSql}`,
        countParams
      ),
      query(
        `SELECT p.*, u.full_name AS user_name
         FROM payments p
         JOIN users u ON p.user_id = u.id
         ${whereSql}
         ORDER BY p.created_at DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    const payload: PaginatedResult<unknown> = {
      items: listResult.rows,
      total,
      page,
      pageSize,
    };

    res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get(
  '/:id/proof',
  authorize(['admin', 'member', 'receptionist']),
  async (req: AuthRequest, res) => {
    const paymentId = parseInt(req.params.id, 10);
    if (Number.isNaN(paymentId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      const { rows } = await query<{ user_id: number; proof_url: string | null }>(
        'SELECT user_id, proof_url FROM payments WHERE id = $1',
        [paymentId]
      );
      const payment = rows[0];
      if (!payment?.proof_url) {
        return res.status(404).json({ error: 'Este pago no tiene comprobante' });
      }

      const user = req.user!;
      if (
        user.role !== 'admin' &&
        user.role !== 'receptionist' &&
        user.id !== Number(payment.user_id)
      ) {
        return res.status(403).json({ error: 'Permisos insuficientes' });
      }

      await streamPaymentProof(payment.proof_url, res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno';
      res.status(500).json({ error: message });
    }
  }
);

router.post(
  '/',
  authorize(['admin', 'member', 'receptionist']),
  uploadRateLimiter,
  proofUpload.single('proof'),
  async (req: AuthRequest, res) => {
    const parsed = paymentReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { amount_usd, amount_bs, exchange_rate, method, reference } = parsed.data;
    const user = req.user!;
    const user_id =
      user.role === 'member'
        ? user.id
        : (parsed.data.user_id ?? parseInt(String(req.body.user_id), 10));

    if ((user.role === 'admin' || user.role === 'receptionist') && Number.isNaN(user_id)) {
      return res.status(400).json({ error: 'user_id requerido' });
    }

    let finalAmountBs = amount_bs ?? null;
    let finalExchangeRate = exchange_rate ?? null;

    if (BS_PAYMENT_METHODS.has(method)) {
      const activeRate = await getActiveUsdRate();
      if (!activeRate) {
        return res.status(503).json({
          error: 'Tasa de cambio no disponible. Contacta al gimnasio.',
        });
      }
      finalExchangeRate = activeRate.rate;
      finalAmountBs = roundBsAmount(amount_usd, activeRate.rate);
    }

    try {
      const { rows } = await query(
        `INSERT INTO payments (user_id, amount_usd, amount_bs, exchange_rate, method, reference, proof_url)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)
       RETURNING id`,
        [user_id, amount_usd, finalAmountBs, finalExchangeRate, method, reference ?? null]
      );

      const paymentId = Number(rows[0].id);
      let proof_url: string | null = null;

      if (req.file) {
        try {
          assertProofUpload(req.file);
          if (isProofStorageRemote()) {
            proof_url = await uploadPaymentProof(req.file, user_id, paymentId);
          } else {
            proof_url = await finalizeLocalProof(req.file);
          }
          await query('UPDATE payments SET proof_url = $1 WHERE id = $2', [proof_url, paymentId]);
        } catch (uploadErr) {
          await query('DELETE FROM payments WHERE id = $1', [paymentId]);
          throw uploadErr;
        }
      }

      res.json({ id: paymentId, status: 'pending', proof_url });
      invalidateAdminStatsCache();
      void notifyPaymentReported(paymentId, user_id, Number(amount_usd)).catch((err) => {
        console.error('[notify] payment reported', err);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno';
      res.status(500).json({ error: message });
    }
  }
);

router.post('/:id/approve', authorize(RECEPTION_STAFF), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const membershipId = req.body.membership_id ? parseInt(String(req.body.membership_id), 10) : null;

  try {
    let approvedUserId = 0;
    let approvedAmount = 0;
    let membershipName: string | undefined;

    await withTransaction(async (client) => {
      const paymentResult = await client.query('SELECT * FROM payments WHERE id = $1', [id]);
      const payment = paymentResult.rows[0];
      if (!payment) throw new AppError('Pago no encontrado', 404, 'Pago no encontrado');
      if (payment.status !== 'pending') {
        throw new AppError('El pago ya ha sido procesado', 400);
      }

      approvedUserId = Number(payment.user_id);
      approvedAmount = Number(payment.amount_usd);

      await client.query("UPDATE payments SET status = 'approved' WHERE id = $1", [id]);

      let membership = null;

      if (membershipId && !Number.isNaN(membershipId)) {
        const byId = await client.query('SELECT * FROM memberships WHERE id = $1', [membershipId]);
        membership = byId.rows[0];
      } else {
        let membershipResult = await client.query(
          'SELECT * FROM memberships WHERE price_usd <= $1 ORDER BY price_usd DESC LIMIT 1',
          [payment.amount_usd]
        );
        if (!membershipResult.rows[0]) {
          membershipResult = await client.query(
            'SELECT * FROM memberships ORDER BY duration_days ASC LIMIT 1'
          );
        }
        membership = membershipResult.rows[0];
      }

      if (membership) {
        membershipName = membership.name;
        await assignSubscription(client, approvedUserId, Number(membership.id));
      }
    });

    await logAudit(req.user!.id, 'payment.approve', {
      payment_id: id,
      membership_id: membershipId,
    });
    invalidateAdminStatsCache();
    res.json({ success: true });

    void notifyPaymentApproved(approvedUserId, approvedAmount, membershipName, Number(id)).catch(
      (err) => {
        console.error('[notify] payment approved', err);
      }
    );
    void (async () => {
      try {
        const userRes = await query('SELECT email, full_name FROM users WHERE id = $1', [
          approvedUserId,
        ]);
        const user = userRes.rows[0];
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: 'Pago aprobado — GymApure',
            html: paymentApprovedEmail(user.full_name, approvedAmount, membershipName),
          });
        }
      } catch {
        /* email failure is non-critical */
      }
    })();
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.clientMessage ?? err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/:id/reject', authorize(RECEPTION_STAFF), async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const { rows } = await query<{ status: string; user_id: number; amount_usd: number }>(
      'SELECT status, user_id, amount_usd FROM payments WHERE id = $1',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pago no encontrado' });
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'El pago ya ha sido procesado' });
    }

    await query("UPDATE payments SET status = 'rejected' WHERE id = $1", [id]);
    await logAudit(req.user!.id, 'payment.reject', { payment_id: id });
    invalidateAdminStatsCache();
    res.json({ success: true });

    void notifyPaymentRejected(
      Number(rows[0].user_id),
      Number(rows[0].amount_usd),
      Number(id)
    ).catch((err) => {
      console.error('[notify] payment rejected', err);
    });
    void (async () => {
      try {
        const userRes = await query('SELECT email, full_name FROM users WHERE id = $1', [
          rows[0].user_id,
        ]);
        const user = userRes.rows[0];
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: 'Pago rechazado — GymApure',
            html: paymentRejectedEmail(user.full_name, Number(rows[0].amount_usd)),
          });
        }
      } catch {
        /* email failure is non-critical */
      }
    })();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
