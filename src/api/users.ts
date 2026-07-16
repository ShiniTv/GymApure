import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.ts';
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
import { activeSubscriptionLateralSql } from '../lib/subscriptions.ts';
import {
  createUserSchema,
  formatZodError,
  assertPasswordNotBreached,
} from '../lib/passwordPolicy.ts';
import { hashPassword } from '../lib/passwordHash.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from '../lib/sqlLike.ts';
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
import { isTrainingShift } from '../lib/trainingShift.ts';
import { mountHealthProfileRoutes } from './healthProfile.ts';
import { invalidateSessionUserCache } from '../lib/sessionUserCache.ts';
import { assignRoutineSchema } from '../lib/routineSchemas.ts';
import { isActiveMember, trainerOwnsRoutine } from '../lib/trainerAccess.ts';

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

const ROUTINE_EXERCISE_PREVIEW_SQL = `(SELECT string_agg(preview_names.name, ' · ')
  FROM (
    SELECT e.name
    FROM routine_exercises re
    JOIN exercises e ON e.id = re.exercise_id
    WHERE re.routine_id = r.id
    ORDER BY re.id
    LIMIT 3
  ) preview_names)`;

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
  ${activeSubscriptionLateralSql()}
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
    const pattern = toLikeContainsPattern(search);
    if (pattern) {
      params.push(pattern);
      const idx = params.length;
      conditions.push(
        `(LOWER(u.full_name) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(COALESCE(u.cedula, '')) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(u.email) LIKE $${idx}${LIKE_ESCAPE_CLAUSE})`
      );
    }
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

  const shiftFilter = typeof query.shift === 'string' ? query.shift.trim() : '';
  if (shiftFilter && isTrainingShift(shiftFilter)) {
    params.push(shiftFilter);
    conditions.push(`u.training_shift = $${params.length}`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

router.get(
  '/options',
  authorize(['admin', 'trainer', 'receptionist']),
  async (req: AuthRequest, res) => {
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
        const pattern = toLikeContainsPattern(search);
        if (pattern) {
          params.push(pattern);
          const idx = params.length;
          conditions.push(
            `(LOWER(full_name) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(COALESCE(cedula, '')) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(email) LIKE $${idx}${LIKE_ESCAPE_CLAUSE})`
          );
        }
      }

      const shiftFilter = typeof req.query.shift === 'string' ? req.query.shift.trim() : '';
      if (shiftFilter && isTrainingShift(shiftFilter)) {
        params.push(shiftFilter);
        conditions.push(`training_shift = $${params.length}`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(200);

      const { rows } = await query<{
        id: number;
        full_name: string;
        cedula: string | null;
        email: string;
        role: string;
        training_shift: string | null;
      }>(
        `SELECT id, full_name, cedula, email, role, training_shift
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
  }
);

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
                u.profile_image, u.dob, u.training_shift, u.created_at,
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
              initial_weight, height, goal, profile_image, dob, training_shift,
              weekly_training_goal, created_at
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
      : await localAvatarPathFromUpload(req.file);

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

router.get('/:id/routines', requireMemberAccess('id'), async (req: AuthRequest, res) => {
  try {
    const trainerScope = req.user!.role === 'trainer' ? ' AND r.trainer_id = $2' : '';
    const params = req.user!.role === 'trainer' ? [req.params.id, req.user!.id] : [req.params.id];

    const { rows } = await query(
      `SELECT r.*, ur.assigned_at, ur.start_date, ur.end_date,
              COALESCE(ec.exercise_count, 0)::int AS exercise_count,
              ${ROUTINE_EXERCISE_PREVIEW_SQL} AS exercise_preview
       FROM routines r
       JOIN user_routines ur ON r.id = ur.routine_id
       LEFT JOIN (
         SELECT routine_id, COUNT(*)::int AS exercise_count
         FROM routine_exercises
         GROUP BY routine_id
       ) ec ON ec.routine_id = r.id
       WHERE ur.user_id = $1${trainerScope}
       ORDER BY ur.assigned_at DESC`,
      params
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

router.get('/:id/history', requireMemberAccess('id'), async (req: AuthRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { page, pageSize, offset } = parsePaginationQuery(req.query, { pageSize: 20 });
  const trainerScope = req.user!.role === 'trainer' ? ' AND r.trainer_id = $2' : '';
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;

  try {
    const countParams = trainerId ? [userId, trainerId] : [userId];
    const listParams = trainerId
      ? [userId, trainerId, pageSize, offset]
      : [userId, pageSize, offset];

    const [countResult, weekResult, listResult] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM workout_sessions ws
         JOIN routines r ON ws.routine_id = r.id
         WHERE ws.user_id = $1${trainerScope}`,
        countParams
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT DATE(ws.start_time))::text AS count
         FROM workout_sessions ws
         JOIN routines r ON ws.routine_id = r.id
         WHERE ws.user_id = $1
           AND ws.end_time IS NOT NULL
           AND ws.start_time >= DATE_TRUNC('week', CURRENT_DATE)${trainerScope}`,
        countParams
      ),
      query(
        `SELECT ws.id, ws.start_time, ws.end_time, ws.success, ws.routine_id,
                r.name AS routine_name,
                COALESCE(wl.sets_completed, 0)::int AS sets_completed
         FROM workout_sessions ws
         JOIN routines r ON ws.routine_id = r.id
         LEFT JOIN (
           SELECT session_id, COUNT(*)::int AS sets_completed
           FROM workout_logs
           GROUP BY session_id
         ) wl ON wl.session_id = ws.id
         WHERE ws.user_id = $1${trainerScope}
         ORDER BY ws.start_time DESC
         LIMIT $${trainerId ? 3 : 2} OFFSET $${trainerId ? 4 : 3}`,
        listParams
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    const workoutsThisWeek = parseInt(weekResult.rows[0]?.count || '0', 10);
    const payload: PaginatedResult<unknown> & { workoutsThisWeek: number } = {
      items: listResult.rows,
      total,
      page,
      pageSize,
      workoutsThisWeek,
    };

    res.json(payload);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post(
  '/:id/routines',
  authorize(['trainer']),
  asyncHandler(async (req: AuthRequest, res) => {
    const memberId = parseInt(req.params.id, 10);
    if (Number.isNaN(memberId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const parsed = assignRoutineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { routine_id, start_date, end_date } = parsed.data;
    if (start_date > end_date) {
      res.status(400).json({
        error: 'La fecha de inicio debe ser anterior o igual a la de fin',
      });
      return;
    }

    const trainerId = req.user!.id;
    const ownsRoutine = await trainerOwnsRoutine(trainerId, routine_id);
    if (!ownsRoutine) {
      res.status(403).json({ error: 'No puedes asignar una rutina que no te pertenece' });
      return;
    }

    const memberOk = await isActiveMember(memberId);
    if (!memberOk) {
      res.status(404).json({ error: 'Miembro no encontrado o inactivo' });
      return;
    }

    const assigned_by = trainerId;
    const existing = await query<{ id: number }>(
      `SELECT id FROM user_routines WHERE user_id = $1 AND routine_id = $2 LIMIT 1`,
      [memberId, routine_id]
    );

    if (existing.rows.length > 0) {
      const { rows } = await query<{ id: number }>(
        `UPDATE user_routines
         SET start_date = $1, end_date = $2, assigned_by = $3, assigned_at = NOW()
         WHERE user_id = $4 AND routine_id = $5
         RETURNING id`,
        [start_date, end_date, assigned_by, memberId, routine_id]
      );
      res.json({ id: rows[0].id, success: true, updated: true });

      void notifyRoutineAssigned(memberId, routine_id).catch((err: unknown) => {
        logger.error('Error enviando notificacion de rutina asignada', {
          error: getErrorMessage(err),
        });
      });
      return;
    }

    const { rows } = await query<{ id: number }>(
      `INSERT INTO user_routines (user_id, routine_id, assigned_by, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [memberId, routine_id, assigned_by, start_date, end_date]
    );
    res.json({ id: rows[0].id, success: true, updated: false });

    void notifyRoutineAssigned(memberId, routine_id).catch((err: unknown) => {
      logger.error('Error enviando notificacion de rutina asignada', {
        error: getErrorMessage(err),
      });
    });
  })
);

router.delete(
  '/:id/routines/:routineId',
  authorize(['trainer']),
  asyncHandler(async (req: AuthRequest, res) => {
    const memberId = parseInt(req.params.id, 10);
    const routineId = parseInt(req.params.routineId, 10);
    if (Number.isNaN(memberId) || Number.isNaN(routineId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const trainerId = req.user!.id;
    const ownsRoutine = await trainerOwnsRoutine(trainerId, routineId);
    if (!ownsRoutine) {
      res.status(403).json({ error: 'No puedes modificar una rutina que no te pertenece' });
      return;
    }

    const { rowCount } = await query(
      'DELETE FROM user_routines WHERE user_id = $1 AND routine_id = $2',
      [memberId, routineId]
    );

    if (!rowCount) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    res.json({ success: true });
  })
);

router.post('/', authorize(['admin', 'trainer', 'receptionist']), async (req: AuthRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { full_name, email, password, cedula, role: requestedRole } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const rawShift =
    typeof req.body?.training_shift === 'string' ? req.body.training_shift.trim() : '';
  const trainingShift = isTrainingShift(rawShift) ? rawShift : null;

  const assignedRole = req.user!.role === 'admin' ? (requestedRole ?? 'member') : 'member';

  if (!['admin', 'trainer', 'member', 'receptionist'].includes(assignedRole)) {
    return res.status(403).json({ error: 'Rol no permitido' });
  }

  if (req.user!.role !== 'admin' && assignedRole !== 'member') {
    return res
      .status(403)
      .json({ error: 'Solo el administrador puede crear otros roles de staff' });
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

    const breachError = await assertPasswordNotBreached(password);
    if (breachError) {
      return res.status(400).json({ error: breachError });
    }

    const hashedPassword = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, cedula, role, password, status, training_shift)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       RETURNING id`,
      [
        full_name,
        normalizedEmail,
        normalizedCedula,
        assignedRole,
        hashedPassword,
        assignedRole === 'member' ? trainingShift : null,
      ]
    );

    const newUserId = rows[0].id;

    if (assignedRole === 'trainer') {
      const level =
        typeof req.body?.level === 'string' &&
        ['basico', 'avanzado', 'especialista'].includes(req.body.level)
          ? req.body.level
          : 'basico';
      const shift =
        typeof req.body?.shift === 'string' && isTrainingShift(req.body.shift)
          ? req.body.shift
          : 'diurno';
      const specialty =
        typeof req.body?.specialty === 'string' ? req.body.specialty.trim() || null : null;
      await query(
        `INSERT INTO trainer_profiles (user_id, level, specialty, shift)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO NOTHING`,
        [newUserId, level, specialty, shift]
      );
    }

    await logAudit(req.user!.id, 'user.create', {
      target_id: newUserId,
      role: assignedRole,
    });

    res.status(201).json({ id: newUserId, success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.patch(
  '/:id/weekly-training-goal',
  requireMemberAccess('id', 'admin', 'trainer'),
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const raw = Number(req.body?.weekly_training_goal);
    if (!Number.isInteger(raw) || raw < 1 || raw > 7) {
      res.status(400).json({ error: 'La meta semanal debe ser un número entre 1 y 7' });
      return;
    }

    const { rows } = await query(
      `UPDATE users SET weekly_training_goal = $1
       WHERE id = $2 AND role = 'member'
       RETURNING id, full_name, weekly_training_goal`,
      [raw, targetId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Miembro no encontrado' });
      return;
    }

    await logAudit(req.user!.id, 'user.weekly_training_goal_update', {
      target_id: targetId,
      weekly_training_goal: raw,
    });

    res.json(rows[0]);
  })
);

router.patch(
  '/:id/training-shift',
  authorize(['admin', 'receptionist']),
  asyncHandler(async (req: AuthRequest, res) => {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const raw = typeof req.body?.training_shift === 'string' ? req.body.training_shift.trim() : '';
    if (!isTrainingShift(raw)) {
      res.status(400).json({ error: 'Turno inválido. Use diurno, vespertino o nocturno.' });
      return;
    }

    const { rows } = await query(
      `UPDATE users SET training_shift = $1
       WHERE id = $2 AND role = 'member'
       RETURNING id, full_name, training_shift`,
      [raw, targetId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Miembro no encontrado' });
      return;
    }

    await logAudit(req.user!.id, 'user.training_shift_update', {
      target_id: targetId,
      training_shift: raw,
    });

    res.json(rows[0]);
  })
);

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
  const targetId = parseInt(String(req.params.id), 10);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await query('UPDATE users SET status = $1, token_version = token_version + 1 WHERE id = $2', [
      status,
      targetId,
    ]);
    invalidateSessionUserCache(targetId);
    await logAudit(req.user!.id, 'user.status_change', {
      target_id: targetId,
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

  const rawConfirmName = req.body?.confirm_name;
  const confirmName = typeof rawConfirmName === 'string' ? rawConfirmName.trim() : '';

  try {
    const { rows } = await query<{ role: string; full_name: string }>(
      'SELECT role, full_name FROM users WHERE id = $1',
      [targetId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (rows[0].role === 'admin') {
      return res.status(403).json({ error: 'No se puede eliminar un administrador' });
    }

    if (rows[0].role === 'trainer') {
      if (confirmName?.toLowerCase() !== rows[0].full_name.trim().toLowerCase()) {
        return res.status(400).json({
          error: 'Escribe el nombre exacto del entrenador para confirmar la eliminación',
        });
      }

      const result = await withTransaction(async (client) => {
        const assigned = await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id
           WHERE r.trainer_id = $1`,
          [targetId]
        );
        if (Number(assigned.rows[0]?.count ?? 0) > 0) {
          return {
            error:
              'Este entrenador tiene rutinas asignadas a miembros. Desactívalo o reasigna esas rutinas antes de eliminarlo.',
            status: 409 as const,
          };
        }

        await client.query(`UPDATE nutrition_plans SET trainer_id = $1 WHERE trainer_id = $2`, [
          req.user!.id,
          targetId,
        ]);
        await client.query(`DELETE FROM routines WHERE trainer_id = $1`, [targetId]);
        await client.query(`DELETE FROM users WHERE id = $1`, [targetId]);
        return { ok: true as const };
      });

      if ('error' in result) {
        return res.status(result.status ?? 409).json({ error: result.error });
      }

      await logAudit(req.user!.id, 'user.delete', {
        target_id: targetId,
        role: 'trainer',
        full_name: rows[0].full_name,
      });
      return res.json({ success: true });
    }

    await query('DELETE FROM users WHERE id = $1', [targetId]);
    await logAudit(req.user!.id, 'user.delete', { target_id: targetId, role: rows[0].role });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

mountHealthProfileRoutes(router);

export default router;
