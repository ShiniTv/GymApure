import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { logAudit } from '../lib/audit.ts';
import {
  createUserSchema,
  formatZodError,
  assertPasswordNotBreached,
} from '../lib/passwordPolicy.ts';
import { hashPassword } from '../lib/passwordHash.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from '../lib/sqlLike.ts';
import { canonicalCedula, cedulaWhereClause } from '../lib/cedulaUtils.ts';
import { isTrainerLevel, isTrainingShift } from '../lib/trainingShift.ts';
import { isActiveMember } from '../lib/trainerAccess.ts';

const router = asyncRouter();

const trainerProfileSchema = z.object({
  level: z.enum(['basico', 'avanzado', 'especialista']).optional(),
  specialty: z.string().trim().max(200).optional().nullable(),
  shift: z.enum(['diurno', 'vespertino', 'nocturno']).optional(),
  bio: z.string().trim().max(2000).optional().nullable(),
});

const createTrainerSchema = createUserSchema.extend({
  role: z.literal('trainer').optional(),
  level: z.enum(['basico', 'avanzado', 'especialista']).default('basico'),
  specialty: z.string().trim().max(200).optional().nullable(),
  shift: z.enum(['diurno', 'vespertino', 'nocturno']),
  bio: z.string().trim().max(2000).optional().nullable(),
});

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

export interface TrainerRow {
  id: number;
  full_name: string;
  email: string;
  cedula: string | null;
  status: string;
  profile_image: string | null;
  level: string;
  specialty: string | null;
  shift: string;
  bio: string | null;
}

const TRAINER_SELECT = `
  SELECT u.id, u.full_name, u.email, u.cedula, u.status, u.profile_image,
         tp.level, tp.specialty, tp.shift, tp.bio
  FROM users u
  INNER JOIN trainer_profiles tp ON tp.user_id = u.id
  WHERE u.role = 'trainer'
`;

router.get('/', authorize(['admin', 'trainer', 'receptionist']), async (req, res) => {
  try {
    const params: unknown[] = [];
    const conditions: string[] = [];

    const shift = typeof req.query.shift === 'string' ? req.query.shift.trim() : '';
    if (shift) {
      if (!isTrainingShift(shift)) {
        return res.status(400).json({ error: 'Turno inválido' });
      }
      params.push(shift);
      conditions.push(`tp.shift = $${params.length}`);
    }

    const level = typeof req.query.level === 'string' ? req.query.level.trim() : '';
    if (level) {
      if (!isTrainerLevel(level)) {
        return res.status(400).json({ error: 'Nivel inválido' });
      }
      params.push(level);
      conditions.push(`tp.level = $${params.length}`);
    }

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (search) {
      const pattern = toLikeContainsPattern(search);
      if (pattern) {
        params.push(pattern);
        const idx = params.length;
        conditions.push(
          `(LOWER(u.full_name) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(COALESCE(tp.specialty, '')) LIKE $${idx}${LIKE_ESCAPE_CLAUSE})`
        );
      }
    }

    const whereExtra = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

    const { rows } = await query<TrainerRow>(
      `${TRAINER_SELECT}${whereExtra} ORDER BY u.full_name ASC`,
      params
    );

    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get('/me', authorize(['trainer']), async (req: AuthRequest, res) => {
  try {
    const { rows } = await query<TrainerRow>(`${TRAINER_SELECT} AND u.id = $1`, [req.user!.id]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Perfil de entrenador no encontrado' });
    }
    res.json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post(
  '/',
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = createTrainerSchema.safeParse({ ...req.body, role: 'trainer' });
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { full_name, email, password, cedula, level, specialty, shift, bio } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const normalizedCedula = canonicalCedula(cedula.trim());
    if (!normalizedCedula) {
      res.status(400).json({ error: 'La cédula es obligatoria' });
      return;
    }

    const emailTaken = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (emailTaken.rows.length > 0) {
      res.status(400).json({ error: 'Este correo ya está registrado' });
      return;
    }

    const cedulaTaken = await query(
      `SELECT id FROM users WHERE ${cedulaWhereClause('cedula', 1)}`,
      [normalizedCedula]
    );
    if (cedulaTaken.rows.length > 0) {
      res.status(400).json({ error: 'Esta cédula ya está registrada' });
      return;
    }

    const breachError = await assertPasswordNotBreached(password);
    if (breachError) {
      res.status(400).json({ error: breachError });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const userResult = await query<{ id: number }>(
      `INSERT INTO users (full_name, email, cedula, role, password, status)
     VALUES ($1, $2, $3, 'trainer', $4, 'active')
     RETURNING id`,
      [full_name, normalizedEmail, normalizedCedula, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    await query(
      `INSERT INTO trainer_profiles (user_id, level, specialty, shift, bio)
     VALUES ($1, $2, $3, $4, $5)`,
      [userId, level, specialty?.trim() || null, shift, bio?.trim() || null]
    );

    await logAudit(req.user!.id, 'trainer.create', { target_id: userId, shift, level });

    const { rows } = await query<TrainerRow>(`${TRAINER_SELECT} AND u.id = $1`, [userId]);
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id/profile',
  authorize(['admin', 'trainer']),
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (req.user!.role === 'trainer' && req.user!.id !== targetId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    const parsed = trainerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const isAdmin = req.user!.role === 'admin';
    const data = parsed.data;
    const sets: string[] = [];
    const params: unknown[] = [];

    if (isAdmin && data.level !== undefined) {
      params.push(data.level);
      sets.push(`level = $${params.length}`);
    }
    if (isAdmin && data.shift !== undefined) {
      params.push(data.shift);
      sets.push(`shift = $${params.length}`);
    }
    if (data.specialty !== undefined) {
      params.push(data.specialty);
      sets.push(`specialty = $${params.length}`);
    }
    if (data.bio !== undefined) {
      params.push(data.bio);
      sets.push(`bio = $${params.length}`);
    }

    if (sets.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    sets.push('updated_at = NOW()');
    params.push(targetId);

    const { rows } = await query(
      `UPDATE trainer_profiles SET ${sets.join(', ')} WHERE user_id = $${params.length}
     RETURNING user_id`,
      params
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Perfil de entrenador no encontrado' });
      return;
    }

    if (isAdmin) {
      await logAudit(req.user!.id, 'trainer.profile_update', { target_id: targetId });
    }

    const result = await query<TrainerRow>(`${TRAINER_SELECT} AND u.id = $1`, [targetId]);
    res.json(result.rows[0]);
  })
);

const assignMemberSchema = z.object({
  member_id: z.coerce.number().int().positive(),
  notes: z.string().trim().max(500).optional().nullable(),
});

router.get(
  '/:id/members',
  authorize(['admin', 'receptionist', 'trainer']),
  asyncHandler(async (req: AuthRequest, res) => {
    const trainerId = parseInt(req.params.id, 10);
    if (Number.isNaN(trainerId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (req.user!.role === 'trainer' && req.user!.id !== trainerId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    const { rows } = await query<{
      id: number;
      full_name: string;
      email: string;
      cedula: string | null;
      assigned_at: string;
      notes: string | null;
      has_active_routine: boolean;
    }>(
      `SELECT u.id, u.full_name, u.email, u.cedula, tma.assigned_at, tma.notes,
              EXISTS (
                SELECT 1 FROM user_routines ur
                JOIN routines r ON r.id = ur.routine_id
                WHERE ur.user_id = u.id AND r.trainer_id = $1
                  AND ur.start_date <= CURRENT_DATE AND ur.end_date >= CURRENT_DATE
              ) AS has_active_routine
       FROM trainer_member_assignments tma
       JOIN users u ON u.id = tma.member_id
       WHERE tma.trainer_id = $1 AND u.role = 'member'
       ORDER BY u.full_name ASC`,
      [trainerId]
    );

    res.json(rows);
  })
);

router.post(
  '/:id/members',
  authorize(['admin', 'receptionist']),
  asyncHandler(async (req: AuthRequest, res) => {
    const trainerId = parseInt(req.params.id, 10);
    if (Number.isNaN(trainerId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const parsed = assignMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const trainerOk = await query<{ ok: number }>(
      `SELECT 1 AS ok FROM users WHERE id = $1 AND role = 'trainer' AND status = 'active' LIMIT 1`,
      [trainerId]
    );
    if (!trainerOk.rows[0]) {
      res.status(404).json({ error: 'Entrenador no encontrado' });
      return;
    }

    const memberOk = await isActiveMember(parsed.data.member_id);
    if (!memberOk) {
      res.status(404).json({ error: 'Miembro no encontrado o inactivo' });
      return;
    }

    await query(
      `INSERT INTO trainer_member_assignments (trainer_id, member_id, assigned_by, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (trainer_id, member_id) DO UPDATE SET notes = COALESCE(EXCLUDED.notes, trainer_member_assignments.notes)`,
      [trainerId, parsed.data.member_id, req.user!.id, parsed.data.notes ?? null]
    );

    await logAudit(req.user!.id, 'trainer.member_assign', {
      trainer_id: trainerId,
      member_id: parsed.data.member_id,
    });

    res.status(201).json({ success: true });
  })
);

router.delete(
  '/:id/members/:memberId',
  authorize(['admin', 'receptionist']),
  asyncHandler(async (req: AuthRequest, res) => {
    const trainerId = parseInt(req.params.id, 10);
    const memberId = parseInt(req.params.memberId, 10);
    if (Number.isNaN(trainerId) || Number.isNaN(memberId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { rowCount } = await query(
      `DELETE FROM trainer_member_assignments WHERE trainer_id = $1 AND member_id = $2`,
      [trainerId, memberId]
    );

    if (!rowCount) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    await logAudit(req.user!.id, 'trainer.member_unassign', {
      trainer_id: trainerId,
      member_id: memberId,
    });

    res.json({ success: true });
  })
);

export default router;
