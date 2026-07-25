import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
import { query } from '../db/index.ts';
import { trainerHasMemberAccess } from '../lib/trainerAccess.ts';

const router = asyncRouter();
const appointmentSchema = z.object({
  member_id: z.coerce.number().int().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  training_block_id: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
const appointmentUpdateSchema = z
  .object({
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
    training_block_id: z.coerce.number().int().positive().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Indica al menos un cambio');

router.get('/', authorize(['trainer', 'admin']), async (req: AuthRequest, res) => {
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;
  const { rows } = await query(
    `SELECT a.id, a.trainer_id, a.member_id, u.full_name AS member_name, a.training_block_id,
            a.starts_at::text, a.ends_at::text, a.status, a.notes
     FROM trainer_appointments a JOIN users u ON u.id = a.member_id
     WHERE (
       $1::bigint IS NULL
       OR (
         a.trainer_id = $1
         AND EXISTS (
           SELECT 1 FROM trainer_member_assignments tma
           WHERE tma.trainer_id = a.trainer_id AND tma.member_id = a.member_id
           UNION
           SELECT 1 FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id
           WHERE ur.user_id = a.member_id AND r.trainer_id = a.trainer_id
         )
       )
     )
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
  if (
    req.user!.role === 'trainer' &&
    !(await trainerHasMemberAccess(trainerId, parsed.data.member_id))
  ) {
    res.status(403).json({ error: 'Solo puedes agendar sesiones con miembros asignados' });
    return;
  }
  const { rows } = await query(
    `INSERT INTO trainer_appointments (trainer_id, member_id, training_block_id, starts_at, ends_at, notes)
     SELECT $1, $2, $3, $4, $5, $6
     WHERE (
       $3::bigint IS NULL
       OR EXISTS (
         SELECT 1 FROM member_training_blocks b WHERE b.id = $3 AND b.member_id = $2
       )
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

router.patch('/:id', authorize(['trainer', 'admin']), async (req: AuthRequest, res) => {
  const appointmentId = Number(req.params.id);
  const parsed = appointmentUpdateSchema.safeParse(req.body);
  if (
    !Number.isInteger(appointmentId) ||
    appointmentId <= 0 ||
    !parsed.success ||
    (parsed.data.starts_at &&
      parsed.data.ends_at &&
      new Date(parsed.data.ends_at) <= new Date(parsed.data.starts_at))
  ) {
    res.status(400).json({ error: 'Datos de sesión inválidos' });
    return;
  }

  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;
  const { rows } = await query(
    `UPDATE trainer_appointments
     SET starts_at = COALESCE($1, starts_at),
         ends_at = COALESCE($2, ends_at),
         training_block_id = CASE WHEN $3::boolean THEN $4 ELSE training_block_id END,
         notes = CASE WHEN $5::boolean THEN $6 ELSE notes END,
         status = COALESCE($7, status),
         updated_at = NOW()
     WHERE id = $8
       AND (
         $9::bigint IS NULL
         OR (
           trainer_id = $9
           AND EXISTS (
             SELECT 1 FROM trainer_member_assignments tma
             WHERE tma.trainer_id = trainer_appointments.trainer_id
               AND tma.member_id = trainer_appointments.member_id
             UNION
             SELECT 1 FROM user_routines ur
             JOIN routines r ON r.id = ur.routine_id
             WHERE ur.user_id = trainer_appointments.member_id
               AND r.trainer_id = trainer_appointments.trainer_id
           )
         )
       )
       AND COALESCE($2::timestamptz, ends_at) > COALESCE($1::timestamptz, starts_at)
       AND (
         $3::boolean = false
         OR $4::bigint IS NULL
         OR EXISTS (
           SELECT 1 FROM member_training_blocks b
           WHERE b.id = $4 AND b.member_id = trainer_appointments.member_id
         )
       )
       AND (
         (status = 'scheduled')
         OR (
           $1::timestamptz IS NULL
           AND $2::timestamptz IS NULL
           AND $3::boolean = false
           AND $5::boolean = false
           AND $7::text IS NULL
         )
       )
     RETURNING id, trainer_id, member_id, training_block_id, starts_at::text, ends_at::text, status, notes`,
    [
      parsed.data.starts_at ?? null,
      parsed.data.ends_at ?? null,
      Object.hasOwn(parsed.data, 'training_block_id'),
      parsed.data.training_block_id ?? null,
      Object.hasOwn(parsed.data, 'notes'),
      parsed.data.notes ?? null,
      parsed.data.status ?? null,
      appointmentId,
      trainerId,
    ]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Sesión no encontrada, no asignada o no editable' });
    return;
  }
  res.json(rows[0]);
});

export default router;
