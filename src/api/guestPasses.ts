import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

const guestPassSchema = z.object({
  full_name: z.string().trim().min(2, 'Nombre requerido').max(150),
  cedula: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  host_user_id: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  valid_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
});

router.use(authorize(RECEPTION_STAFF));

router.post('/', async (req: AuthRequest, res) => {
  const parsed = guestPassSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  const data = parsed.data;
  try {
    if (data.host_user_id) {
      const host = await query('SELECT id FROM users WHERE id = $1', [data.host_user_id]);
      if (!host.rows[0]) return res.status(404).json({ error: 'Anfitrión no encontrado' });
    }
    const { rows } = await query(
      `INSERT INTO guest_passes
        (full_name, cedula, phone, host_user_id, created_by, valid_date, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
       RETURNING *`,
      [
        data.full_name,
        data.cedula || null,
        data.phone || null,
        data.host_user_id || null,
        req.user!.id,
        data.valid_date || null,
        data.notes || null,
      ]
    );
    await logAudit(req.user!.id, 'guest_pass.create', { guest_pass_id: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});

router.get('/', async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Fecha inválida' });
  }
  try {
    const { rows } = await query(
      `SELECT gp.*, u.full_name AS host_name, creator.full_name AS created_by_name
       FROM guest_passes gp
       LEFT JOIN users u ON u.id = gp.host_user_id
       JOIN users creator ON creator.id = gp.created_by
       WHERE gp.valid_date = COALESCE($1::date, CURRENT_DATE)
       ORDER BY gp.used_at NULLS FIRST, gp.created_at DESC`,
      [date || null]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});

router.post('/:id/use', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const { rows } = await query(
      `UPDATE guest_passes
       SET used_at = COALESCE(used_at, NOW())
       WHERE id = $1 AND valid_date = CURRENT_DATE
       RETURNING *`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pase no encontrado o no vigente hoy' });
    await logAudit(req.user!.id, 'guest_pass.use', { guest_pass_id: id });
    res.json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});

export default router;
