import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireSelfOrRoles } from './middleware/access.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

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
              initial_weight, height, goal
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
  const { full_name, email, cedula, role } = req.body;
  const requestedRole = typeof role === 'string' ? role : 'member';
  const assignedRole =
    req.user!.role === 'admin'
      ? requestedRole
      : requestedRole === 'member'
        ? 'member'
        : null;

  if (!assignedRole || !['admin', 'trainer', 'member'].includes(assignedRole)) {
    return res.status(403).json({ error: 'Los entrenadores solo pueden crear miembros' });
  }

  const initialPassword = process.env.DEMO_PASSWORD?.trim();
  if (!initialPassword || initialPassword.length < 12) {
    return res.status(500).json({
      error: 'Define DEMO_PASSWORD en .env (mín. 12 caracteres) para crear usuarios',
    });
  }

  try {
    const hashedPassword = bcrypt.hashSync(initialPassword, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, cedula, role, password, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [full_name, email, cedula ?? null, assignedRole, hashedPassword]
    );

    res.json({ id: rows[0].id, success: true });
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
