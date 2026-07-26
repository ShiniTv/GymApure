import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
import { query } from '../db/index.ts';
import { trainerHasMemberAccess } from '../lib/trainerAccess.ts';
import {
  getTrainerPaymentDestinations,
  upsertTrainerPaymentDestinations,
} from '../lib/trainerBilling.ts';
import {
  normalizePaymentDestinations,
  type PaymentDestinations,
} from '../lib/paymentDestinationsCore.ts';
import { proofUpload } from '../lib/uploadStorage.ts';
import {
  isProofStorageRemote,
  streamPaymentProof,
  uploadPaymentProof,
  finalizeLocalProof,
} from '../lib/proofStorage.ts';
import { toDbId } from '../lib/ids.ts';

const router = asyncRouter();

const offerSchema = z.object({
  title: z.string().trim().min(1).max(120),
  billing_unit: z.enum(['session', 'package', 'month']).default('session'),
  price_usd: z.coerce.number().positive().max(100_000),
  sessions_included: z.coerce.number().int().positive().max(500).nullable().optional(),
  active: z.boolean().optional(),
});

const createInvoiceSchema = z.object({
  member_id: z.coerce.number().int().positive(),
  offer_id: z.coerce.number().int().positive().nullable().optional(),
  appointment_id: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(160),
  amount_usd: z.coerce.number().positive().max(100_000),
});

const reportSchema = z.object({
  method: z.string().trim().min(1).max(50),
  reference: z.string().trim().min(1).max(200),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

async function assertInvoiceAccess(
  req: AuthRequest,
  invoiceId: number
): Promise<{
  id: number;
  trainer_id: number;
  member_id: number;
  status: string;
  proof_url: string | null;
} | null> {
  const { rows } = await query<{
    id: number;
    trainer_id: number;
    member_id: number;
    status: string;
    proof_url: string | null;
  }>(
    `SELECT id, trainer_id, member_id, status::text, proof_url
     FROM trainer_invoices WHERE id = $1`,
    [toDbId(invoiceId)]
  );
  if (rows.length === 0) return null;
  const inv = rows[0];
  const user = req.user!;
  if (user.role === 'trainer' && inv.trainer_id === user.id) return inv;
  if (user.role === 'member' && inv.member_id === user.id) return inv;
  return null;
}

/** ——— Offers ——— */

router.get('/offers', authorize(['trainer']), async (req: AuthRequest, res) => {
  const { rows } = await query(
    `SELECT id, title, billing_unit, price_usd, sessions_included, active, created_at::text
     FROM trainer_service_offers
     WHERE trainer_id = $1
     ORDER BY active DESC, created_at DESC`,
    [toDbId(req.user!.id)]
  );
  res.json(rows);
});

router.post('/offers', authorize(['trainer']), async (req: AuthRequest, res) => {
  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }
  const { rows } = await query(
    `INSERT INTO trainer_service_offers
       (trainer_id, title, billing_unit, price_usd, sessions_included, active)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE))
     RETURNING id, title, billing_unit, price_usd, sessions_included, active, created_at::text`,
    [
      toDbId(req.user!.id),
      parsed.data.title,
      parsed.data.billing_unit,
      parsed.data.price_usd,
      parsed.data.sessions_included ?? null,
      parsed.data.active ?? true,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch('/offers/:id', authorize(['trainer']), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const parsed = offerSchema.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }
  const d = parsed.data;
  const { rows } = await query(
    `UPDATE trainer_service_offers SET
       title = COALESCE($3, title),
       billing_unit = COALESCE($4, billing_unit),
       price_usd = COALESCE($5, price_usd),
       sessions_included = CASE WHEN $6::boolean THEN $7 ELSE sessions_included END,
       active = COALESCE($8, active)
     WHERE id = $1 AND trainer_id = $2
     RETURNING id, title, billing_unit, price_usd, sessions_included, active, created_at::text`,
    [
      toDbId(id),
      toDbId(req.user!.id),
      d.title ?? null,
      d.billing_unit ?? null,
      d.price_usd ?? null,
      d.sessions_included !== undefined,
      d.sessions_included ?? null,
      d.active ?? null,
    ]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Oferta no encontrada' });
    return;
  }
  res.json(rows[0]);
});

/** ——— Destinations (trainer-owned) ——— */

router.get('/destinations', authorize(['trainer']), async (req: AuthRequest, res) => {
  res.json(await getTrainerPaymentDestinations(req.user!.id));
});

/** Member reads destinations of a specific assigned trainer */
router.get(
  '/destinations/:trainerId',
  authorize(['member', 'trainer']),
  async (req: AuthRequest, res) => {
    const trainerId = Number(req.params.trainerId);
    if (!Number.isFinite(trainerId)) {
      res.status(400).json({ error: 'Entrenador inválido' });
      return;
    }
    if (req.user!.role === 'trainer' && req.user!.id !== trainerId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    if (req.user!.role === 'member') {
      const ok = await trainerHasMemberAccess(trainerId, req.user!.id);
      if (!ok) {
        res.status(403).json({ error: 'No estás asignado a este entrenador' });
        return;
      }
    }
    res.json(await getTrainerPaymentDestinations(trainerId));
  }
);

router.put('/destinations', authorize(['trainer']), async (req: AuthRequest, res) => {
  const body = req.body as Partial<PaymentDestinations>;
  const next = await upsertTrainerPaymentDestinations(
    req.user!.id,
    normalizePaymentDestinations({
      ...(await getTrainerPaymentDestinations(req.user!.id)),
      ...body,
    })
  );
  res.json(next);
});

/** ——— Invoices ——— */

router.get('/invoices', authorize(['trainer', 'member']), async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role === 'trainer') {
    const { rows } = await query(
      `SELECT i.id, i.trainer_id, i.member_id, u.full_name AS member_name,
              i.offer_id, i.appointment_id, i.title, i.amount_usd, i.method, i.reference,
              i.proof_url, i.status::text, i.rejection_reason, i.created_at::text, i.confirmed_at::text
       FROM trainer_invoices i
       JOIN users u ON u.id = i.member_id
       WHERE i.trainer_id = $1
       ORDER BY i.created_at DESC
       LIMIT 100`,
      [toDbId(user.id)]
    );
    res.json(rows);
    return;
  }
  const { rows } = await query(
    `SELECT i.id, i.trainer_id, i.member_id, t.full_name AS trainer_name,
            i.offer_id, i.appointment_id, i.title, i.amount_usd, i.method, i.reference,
            i.proof_url, i.status::text, i.rejection_reason, i.created_at::text, i.confirmed_at::text
     FROM trainer_invoices i
     JOIN users t ON t.id = i.trainer_id
     WHERE i.member_id = $1
     ORDER BY i.created_at DESC
     LIMIT 100`,
    [toDbId(user.id)]
  );
  res.json(rows);
});

router.post('/invoices', authorize(['trainer']), async (req: AuthRequest, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }
  const trainerId = req.user!.id;
  const memberId = parsed.data.member_id;
  if (!(await trainerHasMemberAccess(trainerId, memberId))) {
    res.status(403).json({ error: 'Solo puedes cobrar a miembros asignados' });
    return;
  }

  if (parsed.data.offer_id) {
    const { rows: offers } = await query(
      `SELECT id FROM trainer_service_offers WHERE id = $1 AND trainer_id = $2 AND active`,
      [toDbId(parsed.data.offer_id), toDbId(trainerId)]
    );
    if (!offers[0]) {
      res.status(400).json({ error: 'Oferta inválida' });
      return;
    }
  }

  if (parsed.data.appointment_id) {
    const { rows: appts } = await query(
      `SELECT id FROM trainer_appointments
       WHERE id = $1 AND trainer_id = $2 AND member_id = $3`,
      [toDbId(parsed.data.appointment_id), toDbId(trainerId), toDbId(memberId)]
    );
    if (!appts[0]) {
      res.status(400).json({ error: 'Cita inválida' });
      return;
    }
  }

  try {
    const { rows } = await query(
      `INSERT INTO trainer_invoices
         (trainer_id, member_id, offer_id, appointment_id, title, amount_usd, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $1, 'pending')
       RETURNING id, trainer_id, member_id, offer_id, appointment_id, title, amount_usd,
                 method, reference, proof_url, status::text, rejection_reason,
                 created_at::text, confirmed_at::text`,
      [
        toDbId(trainerId),
        toDbId(memberId),
        parsed.data.offer_id ? toDbId(parsed.data.offer_id) : null,
        parsed.data.appointment_id ? toDbId(parsed.data.appointment_id) : null,
        parsed.data.title,
        parsed.data.amount_usd,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('trainer_invoice requires active trainer_member_assignment')) {
      res.status(403).json({ error: 'El miembro no está asignado a ti' });
      return;
    }
    throw err;
  }
});

router.post(
  '/invoices/:id/report',
  authorize(['member']),
  proofUpload.single('proof'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const inv = await assertInvoiceAccess(req, id);
    if (!inv) {
      res.status(404).json({ error: 'Cobro no encontrado' });
      return;
    }
    if (inv.status !== 'pending') {
      res.status(400).json({ error: 'Este cobro ya no admite reporte' });
      return;
    }

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    let proof_url: string | null = inv.proof_url;
    if (req.file) {
      try {
        proof_url = isProofStorageRemote()
          ? await uploadPaymentProof(req.file, inv.trainer_id, inv.id)
          : await finalizeLocalProof(req.file);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al subir comprobante';
        res.status(400).json({ error: message });
        return;
      }
    }

    const { rows } = await query(
      `UPDATE trainer_invoices
       SET method = $2, reference = $3, proof_url = COALESCE($4, proof_url)
       WHERE id = $1 AND member_id = $5 AND status = 'pending'
       RETURNING id, status::text, method, reference, proof_url`,
      [toDbId(inv.id), parsed.data.method, parsed.data.reference, proof_url, toDbId(req.user!.id)]
    );
    res.json(rows[0]);
  }
);

router.post('/invoices/:id/confirm', authorize(['trainer']), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const inv = await assertInvoiceAccess(req, id);
  if (inv?.trainer_id !== req.user!.id) {
    res.status(404).json({ error: 'Cobro no encontrado' });
    return;
  }
  if (inv.status !== 'pending') {
    res.status(400).json({ error: 'Solo se confirman cobros pendientes' });
    return;
  }
  const { rows } = await query(
    `UPDATE trainer_invoices
     SET status = 'confirmed', confirmed_at = NOW(), rejection_reason = NULL
     WHERE id = $1 AND trainer_id = $2 AND status = 'pending'
     RETURNING id, status::text, confirmed_at::text`,
    [toDbId(inv.id), toDbId(req.user!.id)]
  );
  res.json(rows[0]);
});

router.post('/invoices/:id/reject', authorize(['trainer']), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const inv = await assertInvoiceAccess(req, id);
  if (inv?.trainer_id !== req.user!.id) {
    res.status(404).json({ error: 'Cobro no encontrado' });
    return;
  }
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Motivo requerido' });
    return;
  }
  if (inv.status !== 'pending') {
    res.status(400).json({ error: 'Solo se rechazan cobros pendientes' });
    return;
  }
  const { rows } = await query(
    `UPDATE trainer_invoices
     SET status = 'rejected', rejection_reason = $3
     WHERE id = $1 AND trainer_id = $2 AND status = 'pending'
     RETURNING id, status::text, rejection_reason`,
    [toDbId(inv.id), toDbId(req.user!.id), parsed.data.reason]
  );
  res.json(rows[0]);
});

router.post('/invoices/:id/cancel', authorize(['trainer']), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const inv = await assertInvoiceAccess(req, id);
  if (inv?.trainer_id !== req.user!.id) {
    res.status(404).json({ error: 'Cobro no encontrado' });
    return;
  }
  if (inv.status !== 'pending') {
    res.status(400).json({ error: 'Solo se cancelan cobros pendientes' });
    return;
  }
  const { rows } = await query(
    `UPDATE trainer_invoices SET status = 'cancelled'
     WHERE id = $1 AND trainer_id = $2 AND status = 'pending'
     RETURNING id, status::text`,
    [toDbId(inv.id), toDbId(req.user!.id)]
  );
  res.json(rows[0]);
});

router.get(
  '/invoices/:id/proof',
  authorize(['trainer', 'member']),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const inv = await assertInvoiceAccess(req, id);
    if (!inv?.proof_url) {
      res.status(404).json({ error: 'Comprobante no encontrado' });
      return;
    }
    await streamPaymentProof(inv.proof_url, res);
  }
);

/** Assigned members picker for trainer billing UI */
router.get('/members', authorize(['trainer']), async (req: AuthRequest, res) => {
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.cedula
     FROM trainer_member_assignments tma
     JOIN users u ON u.id = tma.member_id
     WHERE tma.trainer_id = $1 AND u.role = 'member' AND COALESCE(u.is_active, TRUE)
     ORDER BY u.full_name ASC`,
    [toDbId(req.user!.id)]
  );
  res.json(rows);
});

export default router;
