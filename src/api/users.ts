import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireSelfOrRoles } from './middleware/access.ts';
import { logAudit } from '../lib/audit.ts';
import { notifyRoutineAssigned } from '../lib/notifications/eventNotifier.ts';
import { avatarApiPath, avatarUpload } from '../lib/uploadStorage.ts';
import { createUserSchema, formatZodError } from '../lib/passwordPolicy.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';

const router = Router();

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

router.get('/', authorize(['admin', 'trainer']), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.email, u.role, u.full_name, u.cedula, u.phone, u.status,
      (SELECT MAX(end_time) FROM workout_sessions WHERE user_id = u.id) as last_workout,
      sub.membership_name,
      sub.end_date AS subscription_end,
      sub.days_remaining
      FROM users u
      LEFT JOIN LATERAL (
        SELECT m.name AS membership_name, s.end_date,
               GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
        FROM subscriptions s
        JOIN memberships m ON m.id = s.membership_id
        WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
        ORDER BY s.end_date DESC
        LIMIT 1
      ) sub ON true
      ORDER BY u.full_name ASC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireSelfOrRoles('id', 'admin', 'trainer'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, role, full_name, cedula, phone, status,
              initial_weight, height, goal, profile_image, dob
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  avatarUpload.single('avatar'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido' });
      return;
    }

    const targetId = parseInt(req.params.id, 10);
    const profileImage = avatarApiPath(req.file.filename);

    const { rows } = await query(
      `UPDATE users SET profile_image = $1 WHERE id = $2
       RETURNING id, profile_image`,
      [profileImage, targetId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ profile_image: rows[0].profile_image });
  })
);

router.get('/:id/routines', requireSelfOrRoles('id', 'admin', 'trainer'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*, ur.assigned_at, ur.start_date, ur.end_date,
              (SELECT COUNT(*)::int FROM routine_exercises WHERE routine_id = r.id) AS exercise_count
       FROM routines r
       JOIN user_routines ur ON r.id = ur.routine_id
       WHERE ur.user_id = $1
       ORDER BY ur.assigned_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/measurements', requireSelfOrRoles('id', 'admin', 'trainer'), async (req, res) => {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/measurements', requireSelfOrRoles('id', 'admin', 'trainer'), async (req, res) => {
  const { date, weight, body_fat_percentage, waist, arm, leg } = req.body;
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', requireSelfOrRoles('id', 'admin', 'trainer'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ws.id, ws.start_time, ws.end_time, ws.success, r.name as routine_name,
      (SELECT COUNT(*)::int FROM workout_logs WHERE session_id = ws.id) as sets_completed
      FROM workout_sessions ws
      JOIN routines r ON ws.routine_id = r.id
      WHERE ws.user_id = $1
      ORDER BY ws.start_time DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/routines', authorize(['admin', 'trainer']), async (req: AuthRequest, res) => {
  const { routine_id, start_date, end_date } = req.body;
  const assigned_by = req.user!.id;
  try {
    const { rows } = await query(
      `INSERT INTO user_routines (user_id, routine_id, assigned_by, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.params.id, routine_id, assigned_by, start_date, end_date]
    );
    res.json({ id: rows[0].id, success: true });

    void notifyRoutineAssigned(Number(req.params.id), Number(routine_id)).catch((err) =>
      console.error('[notify] routine assigned', err)
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/routines/:routineId', authorize(['admin', 'trainer']), async (req, res) => {
  try {
    await query('DELETE FROM user_routines WHERE user_id = $1 AND routine_id = $2', [
      req.params.id,
      req.params.routineId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorize(['admin', 'trainer']), async (req: AuthRequest, res) => {
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

  if (!['admin', 'trainer', 'member'].includes(assignedRole)) {
    return res.status(403).json({ error: 'Los entrenadores solo pueden crear miembros' });
  }

  if (req.user!.role === 'trainer' && assignedRole !== 'member') {
    return res.status(403).json({ error: 'Los entrenadores solo pueden crear miembros' });
  }

  try {
    const emailTaken = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (emailTaken.rows.length > 0) {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    }

    if (cedula?.trim()) {
      const cedulaTaken = await query('SELECT id FROM users WHERE cedula = $1', [cedula.trim()]);
      if (cedulaTaken.rows.length > 0) {
        return res.status(400).json({ error: 'Esta cédula ya está registrada' });
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, cedula, role, password, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [full_name, normalizedEmail, cedula?.trim() || null, assignedRole, hashedPassword]
    );

    await logAudit(req.user!.id, 'user.create', {
      target_id: rows[0].id,
      role: assignedRole,
    });

    res.status(201).json({ id: rows[0].id, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', authorize(['admin']), async (req: AuthRequest, res) => {
  const { status } = req.body;
  try {
    await query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    await logAudit(req.user!.id, 'user.status_change', {
      target_id: req.params.id,
      status,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
