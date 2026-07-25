import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
import { query } from '../db/index.ts';

const router = asyncRouter();
const appointmentSchema = z.object({
  member_id: z.coerce.number().int().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  training_block_id: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

router.get('/', authorize(['trainer', 'admin']), async (req: AuthRequest, res) => {
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;
  const { rows } = await query(
    `SELECT a.id, a.trainer_id, a.member_id, u.full_name AS member_name, a.training_block_id,
            a.starts_at::text, a.ends_at::text, a.status, a.notes
     FROM trainer_appointments a JOIN users u ON u.id = a.member_id
     WHERE ($1::bigint IS NULL OR a.trainer_id = $1)
     ORDER BY a.starts_at ASC LIMIT 100`,
    [trainerId]
  );
  res.json(rows);
});

router.post('/', authorize(['trainer', 'admin']), async (req: AuthRequest, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success || new Date(parsed.data.ends_at) <= new Date(parsed.data.starts_at)) {
    res.status(400).json({ error: 'Datos de sesión inválidos' });
    return;
  }
  const trainerId = req.user!.id;
  const { rows } = await query(
    `INSERT INTO trainer_appointments (trainer_id, member_id, training_block_id, starts_at, ends_at, notes)
     SELECT $1, $2, $3, $4, $5, $6
     WHERE EXISTS (
       SELECT 1 FROM trainer_member_assignments WHERE trainer_id = $1 AND member_id = $2
     )
     RETURNING id, trainer_id, member_id, training_block_id, starts_at::text, ends_at::text, status, notes`,
    [
      trainerId,
      parsed.data.member_id,
      parsed.data.training_block_id ?? null,
      parsed.data.starts_at,
      parsed.data.ends_at,
      parsed.data.notes ?? null,
    ]
  );
  if (!rows[0]) {
    res.status(403).json({ error: 'Solo puedes agendar sesiones con miembros asignados' });
    return;
  }
  res.status(201).json(rows[0]);
});

export default router;
