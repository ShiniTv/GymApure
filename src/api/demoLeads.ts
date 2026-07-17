import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { authorize } from './middleware/auth.ts';
import { query } from '../db/index.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';

const router = asyncRouter();

const leadStatusSchema = z.enum(['pending', 'contacted', 'closed']);
const listQuerySchema = z.object({
  status: leadStatusSchema.optional(),
});
const updateParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const updateStatusSchema = z.object({
  status: leadStatusSchema,
});

router.get(
  '/',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { status } = parsed.data;
    const { rows } = await query(
      `SELECT id, contact_name, email, phone, gym_name, city, message, status, created_at
       FROM demo_requests
       ${status ? 'WHERE status = $1' : ''}
       ORDER BY created_at DESC`,
      status ? [status] : []
    );

    res.json(rows);
  })
);

router.patch(
  '/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const params = updateParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: formatZodError(params.error) });
      return;
    }

    const body = updateStatusSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: formatZodError(body.error) });
      return;
    }

    const { rows } = await query(
      `UPDATE demo_requests
       SET status = $2
       WHERE id = $1
       RETURNING id, contact_name, email, phone, gym_name, city, message, status, created_at`,
      [params.data.id, body.data.status]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Solicitud demo no encontrada' });
      return;
    }

    res.json(rows[0]);
  })
);

export default router;
