import { asyncRouter } from './middleware/asyncRouter.ts';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.ts';
import { authCookieOptions, clearAuthCookieOptions } from '../config/cookies.ts';
import { allowPublicRegister } from '../config/env.ts';
import {
  changePasswordSchema,
  formatZodError,
  loginSchema,
  registerSchema,
} from '../lib/passwordPolicy.ts';
import { authenticate, type AuthRequest } from './middleware/auth.ts';
import { authorize } from './middleware/authorize.ts';
import { logAudit } from '../lib/audit.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { signSessionToken, sessionFailureStatus, verifySessionToken } from '../lib/sessionAuth.ts';

const router = asyncRouter();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const { rows } = await query<{
      id: number | string;
      email: string;
      password: string;
      role: string;
      full_name: string;
      status: string;
      token_version: number | string;
    }>('SELECT id, email, password, role, full_name, status, token_version FROM users WHERE email = $1', [
      normalizedEmail,
    ]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
      return;
    }

    const userId = Number(user.id);
    const token = signSessionToken({
      id: userId,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      token_version: Number(user.token_version ?? 0),
    });

    res.cookie('token', token, authCookieOptions);
    await logAudit(userId, 'auth.login', {});

    res.json({
      user: { id: userId, email: user.email, role: user.role, name: user.full_name },
    });
  })
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    if (!allowPublicRegister) {
      res.status(403).json({ error: 'El registro público está deshabilitado' });
      return;
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { full_name, email, password, cedula, phone } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const normalizedCedula = cedula.trim();

    const existingEmail = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingEmail.rows.length > 0) {
      res.status(400).json({ error: 'Este correo ya está registrado' });
      return;
    }

    const existingCedula = await query('SELECT id FROM users WHERE cedula = $1', [normalizedCedula]);
    if (existingCedula.rows.length > 0) {
      res.status(400).json({ error: 'Esta cédula ya está registrada' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insert = await query<{ id: number | string; token_version: number | string }>(
      `INSERT INTO users (full_name, email, password, role, cedula, phone, status)
       VALUES ($1, $2, $3, 'member', $4, $5, 'active')
       RETURNING id, token_version`,
      [full_name, normalizedEmail, hashedPassword, normalizedCedula, phone?.trim() || null]
    );

    const id = Number(insert.rows[0].id);
    const token = signSessionToken({
      id,
      role: 'member',
      full_name,
      email: normalizedEmail,
      token_version: Number(insert.rows[0].token_version ?? 0),
    });

    res.cookie('token', token, authCookieOptions);
    await logAudit(id, 'auth.register', { email: normalizedEmail });

    res.status(201).json({
      user: { id, email: normalizedEmail, role: 'member', name: full_name },
      message: 'Cuenta creada. Un administrador debe activar tu membresía para acceder al gym.',
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (token) {
      const result = await verifySessionToken(token);
    if (result.type === 'success') {
      await logAudit(result.user.id, 'auth.logout', {});
    }
    }

    res.clearCookie('token', clearAuthCookieOptions);
    res.json({ message: 'Sesión cerrada' });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const result = await verifySessionToken(token);
    if (result.type === 'success') {
      res.json({ user: result.user });
      return;
    }

    const status = sessionFailureStatus(result);
    res.status(status!).json({
      error: status === 403 ? 'Cuenta inactiva. Contacta al administrador.' : 'Sesión expirada',
    });
  })
);

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

    if (!(await bcrypt.compare(current_password, rows[0].password))) {
      res.status(401).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    if (await bcrypt.compare(new_password, rows[0].password)) {
      res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await query(
      'UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2',
      [hashedPassword, userId]
    );
    await logAudit(userId, 'auth.change_password', {});

    res.clearCookie('token', clearAuthCookieOptions);
    res.json({
      success: true,
      message: 'Contraseña actualizada. Inicia sesión de nuevo.',
    });
  })
);

export default router;
