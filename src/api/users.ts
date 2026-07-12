import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireMemberAccess, requireSelfOrRoles } from './middleware/access.ts';
import { logAudit } from '../lib/audit.ts';
import { notifyRoutineAssigned } from '../lib/chat/eventMessages.ts';
import { avatarUpload } from '../lib/uploadStorage.ts';
import {
  uploadMediaFile,
  localAvatarPathFromUpload,
  isMediaStorageRemote,
  deleteMediaFile,
} from '../lib/mediaStorage.ts';
import { assertImageUpload } from '../lib/uploadValidation.ts';
import { createUserSchema, formatZodError } from '../lib/passwordPolicy.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { logger } from '../lib/logger.ts';
import {
  parseBooleanQuery,
  parsePaginationQuery,
  parseSearchQuery,
  type PaginatedResult,
} from '../lib/pagination.ts';
import { getExpiryAlertDays } from '../lib/gymSettings.ts';
import { canonicalCedula, cedulaWhereClause } from '../lib/cedulaUtils.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';

const router = asyncRouter();

const profileSchema = z.object({
  phone: z.string().trim().max(20).optional().nullable(),
  initial_weight: z.coerce.number().positive('Peso inválido').max(500).optional().nullable(),
  height: z.coerce.number().positive('Altura inválida').max(300).optional().nullable(),
  goal: z.string().trim().max(500).optional().nullable(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional()
    .nullable(),
});

const measurementSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  weight: z.coerce.number().positive('Peso inválido').max(500).optional().nullable(),
  body_fat_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  waist: z.coerce.number().positive('Medida inválida').max(300).optional().nullable(),
  arm: z.coerce.number().positive('Medida inválida').max(300).optional().nullable(),
  leg: z.coerce.number().positive('Medida inválida').max(300).optional().nullable(),
});

async function findUserMeasurement(userId: number, measurementId: number) {
  const { rows } = await query<{ id: number }>(
    'SELECT id FROM user_measurements WHERE id = $1 AND user_id = $2',
    [measurementId, userId]
  );
  return rows[0] ?? null;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

const USER_LIST_FROM = `
  FROM users u
  LEFT JOIN (
    SELECT user_id, MAX(end_time) AS last_workout
    FROM workout_sessions
    GROUP BY user_id
  ) lw ON lw.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT m.name AS membership_name, s.end_date,
           GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
    FROM subscriptions s
    JOIN memberships m ON m.id = s.membership_id
    WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
    ORDER BY s.end_date DESC
    LIMIT 1
  ) sub ON true
`;

function buildUserListFilters(
  query: Record<string, unknown>,
  alertDays: number,
  options?: { trainerId?: number; membersOnly?: boolean; activeOnly?: boolean }
): { whereSql: string; params: unknown[] } {
  const search = parseSearchQuery(query);
  const role = typeof query.role === 'string' ? query.role.trim() : '';
  const expiringOnly = parseBooleanQuery(query.expiring);
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(
      `(LOWER(u.full_name) LIKE $${idx} OR LOWER(COALESCE(u.cedula, '')) LIKE $${idx} OR LOWER(u.email) LIKE $${idx})`
    );
  }

  if (role && ['admin', 'trainer', 'member', 'receptionist'].includes(role)) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (options?.membersOnly) {
    conditions.push(`u.role = 'member'`);
  }

  if (options?.activeOnly) {
    conditions.push(`u.status = 'active'`);
  }

  if (options?.trainerId) {
    params.push(options.trainerId);
    conditions.push(`u.id IN (
      SELECT DISTINCT ur.user_id FROM user_routines ur
      JOIN routines r ON r.id = ur.routine_id
      WHERE r.trainer_id = $${params.length}
    )`);
  }

  if (expiringOnly) {
    params.push(alertDays);
    conditions.push(
      `u.role = 'member' AND sub.days_remaining IS NOT NULL AND sub.days_remaining <= $${params.length}`
    );
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

router.get('/options', authorize(['admin', 'trainer', 'receptionist']), async (req, res) => {
  try {
    const search = parseSearchQuery(req.query);
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : 'member';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (['admin', 'trainer', 'member', 'receptionist'].includes(role)) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    conditions.push(`status = 'active'`);

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const idx = params.length;
      conditions.push(
        `(LOWER(full_name) LIKE $${idx} OR LOWER(COALESCE(cedula, '')) LIKE $${idx} OR LOWER(email) LIKE $${idx})`
      );
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(200);

    const { rows } = await query<{ id: number; full_name: string; cedula: string | null; email: string; role: string }>(
      `SELECT id, full_name, cedula, email, role
       FROM users
       ${whereSql}
       ORDER BY full_name ASC
       LIMIT $${params.length}`,
      params
    );

    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get('/', authorize(['admin', 'trainer', 'receptionist']), async (req: AuthRequest, res) => {
  try {
    const { page, pageSize, offset } = parsePaginationQuery(req.query);
    const alertDays = await getExpiryAlertDays();
    const listOptions =
      req.user!.role === 'trainer'
        ? { membersOnly: true, activeOnly: true }
        : req.user!.role === 'receptionist'
          ? { membersOnly: true }
          : undefined;
    const { whereSql, params } = buildUserListFilters(req.query, alertDays, listOptions);

    const countParams = [...params];
    const listParams = [...params, pageSize, offset];

    const [countResult, listResult] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count ${USER_LIST_FROM} ${whereSql}`,
        countParams
      ),
      query(
        `SELECT u.id, u.email, u.role, u.full_name, u.cedula, u.phone, u.status,
                lw.last_workout,
                sub.membership_name,
                sub.end_date AS subscription_end,
                sub.days_remaining
         ${USER_LIST_FROM}
         ${whereSql}
         ORDER BY u.full_name ASC
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
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get('/:id', requireMemberAccess('id', 'admin', 'receptionist'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, role, full_name, cedula, phone, status,
              initial_weight, height, goal, profile_image, dob
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.patch(
  '/:id/profile',
  requireSelfOrRoles('id', 'admin'),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    const targetId = parseInt(req.params.id, 10);
    const data = parsed.data;
    const fields = ['phone', 'initial_weight', 'height', 'goal', 'dob'] as const;
    const sets: string[] = [];
    const params: unknown[] = [];

    for (const key of fields) {
      if (key in data) {
        sets.push(`${key} = $${params.length + 1}`);
        params.push(data[key] ?? null);
      }
    }

    if (sets.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    params.push(targetId);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, email, role, full_name, cedula, phone, status,
                 initial_weight, height, goal, profile_image, dob`,
      params
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (req.user!.id !== targetId) {
      await logAudit(req.user!.id, 'user.profile_update', { target_id: targetId });
    }

    res.json(rows[0]);
  })
);

router.post(
  '/:id/avatar',
  requireSelfOrRoles('id', 'admin'),
  uploadRateLimiter,
  avatarUpload.single('avatar'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido' });
      return;
    }

    try {
      assertImageUpload(req.file);
    } catch (err: unknown) {
      res.status(400).json({ error: getErrorMessage(err) });
      return;
    }

    const targetId = parseInt(req.params.id, 10);

    const { rows: existing } = await query<{ profile_image: string | null }>(
      `SELECT profile_image FROM users WHERE id = $1`,
      [targetId]
    );
    const previousImage = existing[0]?.profile_image ?? null;

    const profileImage = isMediaStorageRemote()
      ? await uploadMediaFile('avatars', req.file, String(targetId))
      : localAvatarPathFromUpload(req.file);

    const { rows } = await query(
      `UPDATE users SET profile_image = $1 WHERE id = $2
       RETURNING id, profile_image`,
      [profileImage, targetId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (previousImage && previousImage !== profileImage) {
      void deleteMediaFile(previousImage);
    }

    res.json({ profile_image: rows[0].profile_image });
  })
);

router.delete(
  '/:id/avatar',
  requireSelfOrRoles('id', 'admin'),
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);

    const { rows: existing } = await query<{ profile_image: string | null }>(
      `SELECT profile_image FROM users WHERE id = $1`,
      [targetId]
    );

    if (!existing[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (!existing[0].profile_image) {
      res.status(404).json({ error: 'No hay foto de perfil' });
      return;
    }

    const previousImage = existing[0].profile_image;

    const { rows } = await query(
      `UPDATE users SET profile_image = NULL WHERE id = $1
       RETURNING id, profile_image`,
      [targetId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    void deleteMediaFile(previousImage);

    res.json({ profile_image: null });
  })
);

router.get('/:id/routines', requireMemberAccess('id', 'admin'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*, ur.assigned_at, ur.start_date, ur.end_date,
              COALESCE(ec.exercise_count, 0)::int AS exercise_count
       FROM routines r
       JOIN user_routines ur ON r.id = ur.routine_id
       LEFT JOIN (
         SELECT routine_id, COUNT(*)::int AS exercise_count
         FROM routine_exercises
         GROUP BY routine_id
       ) ec ON ec.routine_id = r.id
       WHERE ur.user_id = $1
       ORDER BY ur.assigned_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get('/:id/measurements', requireMemberAccess('id', 'admin'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, date, weight, body_fat_percentage, waist, arm, leg, created_at
       FROM user_measurements
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/:id/measurements', requireMemberAccess('id', 'admin'), async (req, res) => {
  const parsed = measurementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { date, weight, body_fat_percentage, waist, arm, leg } = parsed.data;
  try {
    const { rows } = await query(
      `INSERT INTO user_measurements (user_id, date, weight, body_fat_percentage, waist, arm, leg)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, date, weight, body_fat_percentage, waist, arm, leg, created_at`,
      [
        req.params.id,
        date || new Date().toISOString().split('T')[0],
        weight ?? null,
        body_fat_percentage ?? null,
        waist ?? null,
        arm ?? null,
        leg ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.patch(
  '/:id/measurements/:measurementId',
  requireMemberAccess('id', 'admin'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const measurementId = parseInt(req.params.measurementId, 10);
    if (Number.isNaN(userId) || Number.isNaN(measurementId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const parsed = measurementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const existing = await findUserMeasurement(userId, measurementId);
    if (!existing) {
      res.status(404).json({ error: 'Medición no encontrada' });
      return;
    }

    const data = parsed.data;
    const fields = ['date', 'weight', 'body_fat_percentage', 'waist', 'arm', 'leg'] as const;
    const sets: string[] = [];
    const params: unknown[] = [];

    for (const key of fields) {
      if (key in data) {
        sets.push(`${key} = $${params.length + 1}`);
        params.push(data[key] ?? null);
      }
    }

    if (sets.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    params.push(measurementId, userId);
    const { rows } = await query(
      `UPDATE user_measurements SET ${sets.join(', ')}
       WHERE id = $${params.length - 1} AND user_id = $${params.length}
       RETURNING id, date, weight, body_fat_percentage, waist, arm, leg, created_at`,
      params
    );

    res.json(rows[0]);
  })
);

router.delete(
  '/:id/measurements/:measurementId',
  requireMemberAccess('id', 'admin'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const measurementId = parseInt(req.params.measurementId, 10);
    if (Number.isNaN(userId) || Number.isNaN(measurementId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const existing = await findUserMeasurement(userId, measurementId);
    if (!existing) {
      res.status(404).json({ error: 'Medición no encontrada' });
      return;
    }

    await query('DELETE FROM user_measurements WHERE id = $1 AND user_id = $2', [
      measurementId,
      userId,
    ]);
    res.json({ success: true });
  })
);

router.get('/:id/history', requireMemberAccess('id', 'admin'), async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { page, pageSize, offset } = parsePaginationQuery(req.query, { pageSize: 20 });

  try {
    const [countResult, listResult] = await Promise.all([
      query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM workout_sessions WHERE user_id = $1',
        [userId]
      ),
      query(
        `SELECT ws.id, ws.start_time, ws.end_time, ws.success, r.name AS routine_name,
                COALESCE(wl.sets_completed, 0)::int AS sets_completed
         FROM workout_sessions ws
         JOIN routines r ON ws.routine_id = r.id
         LEFT JOIN (
           SELECT session_id, COUNT(*)::int AS sets_completed
           FROM workout_logs
           GROUP BY session_id
         ) wl ON wl.session_id = ws.id
         WHERE ws.user_id = $1
         ORDER BY ws.start_time DESC
         LIMIT $2 OFFSET $3`,
        [userId, pageSize, offset]
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
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/:id/routines', authorize(['admin', 'trainer']), async (req: AuthRequest, res) => {
  const { routine_id, start_date, end_date } = req.body;
  const assigned_by = req.user!.id;
  const memberId = parseInt(req.params.id, 10);
  const routineId = parseInt(String(routine_id), 10);

  if (Number.isNaN(memberId) || Number.isNaN(routineId)) {
    return res.status(400).json({ error: 'ID de miembro o rutina inválido' });
  }

  try {
    const { rows: memberRows } = await query<{ role: string; status: string }>(
      `SELECT role, status FROM users WHERE id = $1`,
      [memberId]
    );
    const member = memberRows[0];
    if (!member) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }
    if (member.role !== 'member') {
      return res.status(400).json({ error: 'Solo se pueden asignar rutinas a miembros' });
    }
    if (member.status !== 'active') {
      return res.status(400).json({ error: 'El miembro no está activo' });
    }

    const { rows: routineRows } = await query<{ trainer_id: number }>(
      `SELECT trainer_id FROM routines WHERE id = $1`,
      [routineId]
    );
    const routine = routineRows[0];
    if (!routine) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }
    if (req.user!.role === 'trainer' && routine.trainer_id !== req.user!.id) {
      return res.status(403).json({ error: 'No puedes asignar rutinas de otro entrenador' });
    }

    const { rows } = await query(
      `INSERT INTO user_routines (user_id, routine_id, assigned_by, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [memberId, routineId, assigned_by, start_date, end_date]
    );
    res.json({ id: rows[0].id, success: true });

    void notifyRoutineAssigned(memberId, routineId).catch((err: unknown) =>
      logger.error('Error enviando notificacion de rutina asignada', {
        error: getErrorMessage(err),
      })
    );
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.delete('/:id/routines/:routineId', authorize(['admin', 'trainer']), async (req, res) => {
  try {
    await query('DELETE FROM user_routines WHERE user_id = $1 AND routine_id = $2', [
      req.params.id,
      req.params.routineId,
    ]);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/', authorize(['admin', 'trainer', 'receptionist']), async (req: AuthRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { full_name, email, password, cedula, role: requestedRole } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const assignedRole =
    req.user!.role === 'admin'
      ? requestedRole ?? 'member'
      : 'member';

  if (!['admin', 'trainer', 'member', 'receptionist'].includes(assignedRole)) {
    return res.status(403).json({ error: 'Rol no permitido' });
  }

  if (req.user!.role !== 'admin' && assignedRole !== 'member') {
    return res.status(403).json({ error: 'Solo el administrador puede crear otros roles de staff' });
  }

  const normalizedCedula = cedula?.trim() ? canonicalCedula(cedula.trim()) : null;
  if (!normalizedCedula) {
    return res.status(400).json({ error: 'La cédula es obligatoria para el check-in en el gym' });
  }

  try {
    const emailTaken = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (emailTaken.rows.length > 0) {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    }

    const cedulaTaken = await query(
      `SELECT id FROM users WHERE ${cedulaWhereClause('cedula', 1)}`,
      [normalizedCedula]
    );
    if (cedulaTaken.rows.length > 0) {
      return res.status(400).json({ error: 'Esta cédula ya está registrada' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, cedula, role, password, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [full_name, normalizedEmail, normalizedCedula, assignedRole, hashedPassword]
    );

    await logAudit(req.user!.id, 'user.create', {
      target_id: rows[0].id,
      role: assignedRole,
    });

    res.status(201).json({ id: rows[0].id, success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.patch(
  '/:id/cedula',
  authorize(RECEPTION_STAFF),
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const raw = typeof req.body?.cedula === 'string' ? req.body.cedula : '';
    const normalizedCedula = canonicalCedula(raw);
    if (!normalizedCedula) {
      res.status(400).json({ error: 'Cédula inválida' });
      return;
    }

    const cedulaTaken = await query(
      `SELECT id FROM users WHERE ${cedulaWhereClause('cedula', 1)} AND id <> $2`,
      [normalizedCedula, targetId]
    );
    if (cedulaTaken.rows[0]) {
      res.status(400).json({ error: 'Esta cédula ya está registrada' });
      return;
    }

    const { rows } = await query(
      `UPDATE users SET cedula = $1 WHERE id = $2
       RETURNING id, full_name, cedula`,
      [normalizedCedula, targetId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await logAudit(req.user!.id, 'user.cedula_update', {
      target_id: targetId,
      cedula: normalizedCedula,
    });

    res.json(rows[0]);
  })
);

router.patch('/:id/status', authorize(['admin']), async (req: AuthRequest, res) => {
  const { status } = req.body;
  try {
    await query(
      'UPDATE users SET status = $1, token_version = token_version + 1 WHERE id = $2',
      [status, req.params.id]
    );
    await logAudit(req.user!.id, 'user.status_change', {
      target_id: req.params.id,
      status,
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.delete('/:id', authorize(['admin']), async (req: AuthRequest, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  if (req.user!.id === targetId) {
    return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  try {
    const { rows } = await query<{ role: string }>('SELECT role FROM users WHERE id = $1', [
      targetId,
    ]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (rows[0].role === 'admin') {
      return res.status(403).json({ error: 'No se puede eliminar un administrador' });
    }
    if (rows[0].role === 'trainer') {
      return res.status(403).json({
        error: 'No se puede eliminar un entrenador desde aquí. Desactívalo o contacta soporte.',
      });
    }

    await query('DELETE FROM users WHERE id = $1', [targetId]);
    await logAudit(req.user!.id, 'user.delete', { target_id: targetId, role: rows[0].role });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;
