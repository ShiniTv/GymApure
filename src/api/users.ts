import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { logAudit } from '../lib/audit.ts';
import { avatarUpload } from '../lib/uploadStorage.ts';
import {
  uploadMediaFile,
  localAvatarPathFromUpload,
  isMediaStorageRemote,
  deleteMediaFile,
} from '../lib/mediaStorage.ts';
import { assertImageUpload } from '../lib/uploadValidation.ts';
import {
  createUserSchema,
  formatZodError,
  assertPasswordNotBreached,
} from '../lib/passwordPolicy.ts';
import { hashPassword } from '../lib/passwordHash.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from '../lib/sqlLike.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
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
import { mountExerciseRecordRoutes } from './exerciseRecords.ts';
import { mountCoachNoteRoutes } from './coachNotes.ts';
import { mountTrainerCoachingRoutes } from './trainerCoaching.ts';
import { mountTrainingBlockRoutes } from './trainingBlocks.ts';
import { invalidateSessionUserCache } from '../lib/sessionUserCache.ts';
import { ensureTrainerMemberAssignment } from '../lib/trainerAccess.ts';
import { buildUserListFilters, USER_LIST_FROM, userCountFromSql } from './users/listHelpers.ts';
import { mountUserMeasurementRoutes } from './users/measurements.ts';
import { mountUserRoutineRoutes } from './users/memberRoutines.ts';
import { mountUserHistoryRoutes } from './users/history.ts';

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

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
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

      if (req.user!.role === 'trainer') {
        params.push(req.user!.id);
        conditions.push(`id IN (
          SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $${params.length}
          UNION
          SELECT DISTINCT ur.user_id FROM user_routines ur
          JOIN routines r ON r.id = ur.routine_id
          WHERE r.trainer_id = $${params.length}
        )`);
      }

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
        ? { membersOnly: true, activeOnly: true, trainerId: req.user!.id }
        : req.user!.role === 'receptionist'
          ? { membersOnly: true }
          : undefined;
    const { whereSql, params } = buildUserListFilters(req.query, alertDays, listOptions);
    const expiringOnly = parseBooleanQuery(req.query.expiring);

    const countParams = [...params];
    const listParams = [...params, pageSize, offset];

    const [countResult, listResult] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count ${userCountFromSql(expiringOnly)} ${whereSql}`,
        countParams
      ),
      query(
        `SELECT u.id, u.email, u.role, u.full_name, u.cedula, u.phone, u.status,
                u.profile_image, u.dob, u.training_shift, u.created_at,
                lw.last_workout,
                COALESCE(sub.membership_name, paused_sub.membership_name) AS membership_name,
                COALESCE(sub.end_date, paused_sub.end_date) AS subscription_end,
                COALESCE(sub.days_remaining, paused_sub.pause_days_remaining) AS days_remaining,
                CASE
                  WHEN sub.membership_name IS NOT NULL THEN 'active'
                  WHEN paused_sub.membership_name IS NOT NULL THEN 'paused'
                  ELSE NULL
                END AS subscription_status,
                CASE WHEN u.role = 'member' THEN json_build_object(
                  'has_trainer_assignment',
                  COALESCE(ob.has_trainer_assignment, false),
                  'has_active_routine',
                  COALESCE(ob.has_active_routine, false)
                ) ELSE NULL END AS onboarding
         ${USER_LIST_FROM}
         LEFT JOIN LATERAL (
           SELECT
             EXISTS (
               SELECT 1 FROM trainer_member_assignments tma WHERE tma.member_id = u.id
             ) OR EXISTS (
               SELECT 1 FROM user_routines ur WHERE ur.user_id = u.id
             ) AS has_trainer_assignment,
             EXISTS (
               SELECT 1 FROM user_routines ur
               WHERE ur.user_id = u.id
                 AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
                 AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
             ) AS has_active_routine
           WHERE u.role = 'member'
         ) ob ON true
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
  requireMemberAccess('id', 'admin', 'receptionist'),
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
  requireMemberAccess('id', 'admin', 'receptionist'),
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
  requireMemberAccess('id', 'admin', 'receptionist'),
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
    return res.status(400).json({ error: 'La cédula es obligatoria para el acceso al gym' });
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

    if (req.user!.role === 'trainer' && assignedRole === 'member') {
      await ensureTrainerMemberAssignment(req.user!.id, newUserId, req.user!.id);
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

router.get(
  '/:id/progress',
  requireMemberAccess('id'),
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { rows: weeklyRows } = await query<{
      week_start: string;
      volume_kg: string;
      max_weight_kg: string;
      workouts: number;
    }>(
      `WITH weeks AS (
         SELECT generate_series(
           DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 weeks',
           DATE_TRUNC('week', CURRENT_DATE),
           INTERVAL '1 week'
         )::date AS week_start
       ),
       workout_totals AS (
         SELECT DATE_TRUNC('week', ws.start_time)::date AS week_start,
                COALESCE(SUM(wl.weight * wl.reps), 0)::numeric AS volume_kg,
                COALESCE(MAX(wl.weight), 0)::numeric AS max_weight_kg,
                COUNT(DISTINCT DATE(ws.start_time))::int AS workouts
         FROM workout_sessions ws
         LEFT JOIN workout_logs wl ON wl.session_id = ws.id
         WHERE ws.user_id = $1
           AND ws.end_time IS NOT NULL
           AND ws.success = 1
           AND ws.start_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 weeks'
         GROUP BY DATE_TRUNC('week', ws.start_time)::date
       )
       SELECT weeks.week_start::text, COALESCE(workout_totals.volume_kg, 0)::text AS volume_kg,
              COALESCE(workout_totals.max_weight_kg, 0)::text AS max_weight_kg,
              COALESCE(workout_totals.workouts, 0)::int AS workouts
       FROM weeks
       LEFT JOIN workout_totals ON workout_totals.week_start = weeks.week_start
       ORDER BY weeks.week_start`,
      [userId]
    );
    const { rows: goalRows } = await query<{ weekly_training_goal: number }>(
      'SELECT weekly_training_goal FROM users WHERE id = $1',
      [userId]
    );
    const weeklyGoal = goalRows[0]?.weekly_training_goal ?? 5;
    const currentWeek = weeklyRows.at(-1);

    res.json({
      weekly_goal: weeklyGoal,
      workouts_this_week: currentWeek?.workouts ?? 0,
      goal_completion_percent: Math.min(
        100,
        Math.round(((currentWeek?.workouts ?? 0) / Math.max(weeklyGoal, 1)) * 100)
      ),
      weeks: weeklyRows.map((row) => ({
        week_start: row.week_start,
        volume_kg: Math.round(Number(row.volume_kg)),
        max_weight_kg: Math.round(Number(row.max_weight_kg)),
        workouts: row.workouts,
      })),
    });
  })
);

mountUserMeasurementRoutes(router);
mountUserRoutineRoutes(router);
mountUserHistoryRoutes(router);
mountHealthProfileRoutes(router);
mountExerciseRecordRoutes(router);
mountCoachNoteRoutes(router);
mountTrainerCoachingRoutes(router);
mountTrainingBlockRoutes(router);

export default router;
