import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.ts';
import { authCookieOptions, clearAuthCookieOptions } from '../config/cookies.ts';
import { JWT_EXPIRES_IN, JWT_SECRET, type JwtUserPayload } from '../config/jwt.ts';
import { allowPublicRegister } from '../config/env.ts';
import { changePasswordSchema, formatZodError, registerSchema } from '../lib/passwordPolicy.ts';
import { authenticate, type AuthRequest } from './middleware/auth.ts';
import { logAudit } from '../lib/audit.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
    }

    const userId = Number(user.id);
    const payload: JwtUserPayload = {
      id: userId,
      role: user.role,
      name: user.full_name,
      email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, authCookieOptions);
    res.json({
      user: { id: userId, email: user.email, role: user.role, name: user.full_name },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/register', async (req, res) => {
  if (!allowPublicRegister) {
    return res.status(403).json({ error: 'El registro público está deshabilitado' });
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { full_name, email, password, cedula, phone } = parsed.data;

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const insert = await query(
      `INSERT INTO users (full_name, email, password, role, cedula, phone, status)
       VALUES ($1, $2, $3, 'member', $4, $5, 'active')
       RETURNING id`,
      [full_name, email, hashedPassword, cedula || null, phone || null]
    );

    const id = Number(insert.rows[0].id);
    const payload: JwtUserPayload = { id, role: 'member', name: full_name, email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, authCookieOptions);
    res.status(201).json({ user: { id, email, role: 'member', name: full_name } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', clearAuthCookieOptions);
  res.json({ message: 'Logged out' });
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    res.json({ user: { ...decoded, id: Number(decoded.id) } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { current_password, new_password } = parsed.data;
    const userId = req.user!.id;

    const { rows } = await query<{ password: string }>(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (!bcrypt.compareSync(current_password, rows[0].password)) {
      res.status(401).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    if (bcrypt.compareSync(new_password, rows[0].password)) {
      res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
      return;
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    await logAudit(userId, 'auth.change_password', {});

    res.json({ success: true, message: 'Contraseña actualizada' });
  })
);

export default router;
