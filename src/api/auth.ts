import { asyncRouter } from './middleware/asyncRouter.ts';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/index.ts';
import { authCookieOptions, clearAuthCookieOptions } from '../config/cookies.ts';
import { allowPublicRegister } from '../config/env.ts';
import {
  changePasswordSchema,
  formatZodError,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../lib/passwordPolicy.ts';
import { authenticate, type AuthRequest } from './middleware/auth.ts';
import { logAudit } from '../lib/audit.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import {
  signSessionToken,
  sessionFailureStatus,
  verifySessionToken,
  createLoginSession,
  bumpUserTokenVersion,
} from '../lib/sessionAuth.ts';
import { emitToUser } from '../lib/wsServer.ts';
import { sendEmail, welcomeEmail, passwordResetEmail } from '../lib/email.ts';
import {
  buildPasswordSetupUrl,
  createPasswordSetupToken,
  FORGOT_PASSWORD_EXPIRY_HOURS,
} from '../lib/passwordSetupToken.ts';
import { logger } from '../lib/logger.ts';

const router = asyncRouter();

interface LoginAttemptEntry {
  count: number;
  windowExpires: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptEntry>();

const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_BLOCK_MINUTES = 15;
const LOGIN_WINDOW_MINUTES = 15;

function checkLoginBlock(email: string): boolean {
  const entry = loginAttempts.get(email);
  if (!entry) return false;

  const now = Date.now();
  if (entry.lockedUntil != null && now < entry.lockedUntil) {
    return true;
  }

  if (now >= entry.windowExpires) {
    loginAttempts.delete(email);
  }
  return false;
}

function recordLoginAttempt(email: string, success: boolean) {
  const normalizedEmail = email.toLowerCase();
  if (success) {
    loginAttempts.delete(normalizedEmail);
    return;
  }

  const now = Date.now();
  const entry = loginAttempts.get(normalizedEmail);

  if (!entry || now >= entry.windowExpires) {
    loginAttempts.set(normalizedEmail, {
      count: 1,
      windowExpires: now + LOGIN_WINDOW_MINUTES * 60 * 1000,
    });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_BLOCK_MINUTES * 60 * 1000;
  }
}

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
    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    if (checkLoginBlock(normalizedEmail)) {
      res.status(429).json({
        error: `Demasiados intentos. Cuenta bloqueada por ${LOGIN_BLOCK_MINUTES} minutos.`,
      });
      return;
    }

    const { rows } = await query<{
      id: number | string;
      email: string;
      password: string;
      role: string;
      full_name: string;
      status: string;
      token_version: number | string;
    }>(
      'SELECT id, email, password, role, full_name, status, token_version FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      recordLoginAttempt(normalizedEmail, false);
      await logAudit(null, 'auth.login_failed', {
        email: normalizedEmail,
        ip: clientIp,
        reason: 'invalid_credentials',
      });
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    if (user.status !== 'active') {
      recordLoginAttempt(normalizedEmail, false);
      await logAudit(Number(user.id), 'auth.login_failed', {
        email: normalizedEmail,
        ip: clientIp,
        reason: 'inactive_account',
      });
      res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
      return;
    }

    recordLoginAttempt(normalizedEmail, true);

    const userId = Number(user.id);
    emitToUser(userId, 'session:revoked', { reason: 'login_elsewhere' });

    const session = await createLoginSession(userId);
    if (session.type === 'failure') {
      res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
      return;
    }

    res.cookie('token', session.token, authCookieOptions);
    await logAudit(userId, 'auth.login', { ip: clientIp, previous_sessions_invalidated: true });

    res.json({
      user: {
        id: userId,
        email: session.user.email,
        role: session.user.role,
        name: session.user.full_name,
      },
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

    const existingCedula = await query('SELECT id FROM users WHERE cedula = $1', [
      normalizedCedula,
    ]);
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
    void sendEmail({
      to: normalizedEmail,
      subject: 'Bienvenido a GymApure',
      html: welcomeEmail(full_name),
    });

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
        await bumpUserTokenVersion(result.user.id);
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
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const result = await verifySessionToken(token);
    if (result.type !== 'success') {
      const status = sessionFailureStatus(result);
      res.status(status!).json({
        error:
          status === 403
            ? 'Cuenta inactiva. Contacta al administrador.'
            : 'Sesión expirada. Inicia sesión de nuevo.',
      });
      return;
    }

    const newToken = signSessionToken({
      id: result.user.id,
      role: result.user.role,
      full_name: result.user.name,
      email: result.user.email,
      token_version: result.user.token_version ?? 0,
    });

    res.cookie('token', newToken, authCookieOptions);
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        name: result.user.name,
      },
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

    const { rows } = await query<{ password: string }>('SELECT password FROM users WHERE id = $1', [
      userId,
    ]);
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
    await query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
      hashedPassword,
      userId,
    ]);
    await logAudit(userId, 'auth.change_password', {});

    res.clearCookie('token', clearAuthCookieOptions);
    res.json({
      success: true,
      message: 'Contraseña actualizada. Inicia sesión de nuevo.',
    });
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const { rows } = await query<{ id: number; full_name: string; email: string }>(
      'SELECT id, full_name, email FROM users WHERE LOWER(email) = $1 AND status = $2',
      [email, 'active']
    );

    if (rows[0]) {
      const user = rows[0];
      const rawToken = await createPasswordSetupToken(user.id, FORGOT_PASSWORD_EXPIRY_HOURS);
      const resetUrl = buildPasswordSetupUrl(rawToken);
      const sent = await sendEmail({
        to: user.email,
        subject: 'Recuperar contraseña — GymApure',
        html: passwordResetEmail(user.full_name, resetUrl),
      });

      if (!sent) {
        logger.error('No se pudo enviar email de recuperación', { userId: user.id });
        if (process.env.NODE_ENV === 'development') {
          // En local, el enlace aparece en la terminal por si Gmail falla
          console.log('\n─── DEV: enlace de recuperación de contraseña ───');
          console.log(resetUrl);
          console.log('────────────────────────────────────────────────\n');
        }
      }

      await logAudit(user.id, 'auth.forgot_password', {});
    }

    res.json({
      success: true,
      message:
        'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { token, new_password } = parsed.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await query<{
      id: number;
      user_id: number;
      expires_at: string;
      used_at: string | null;
    }>(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );

    const record = rows[0];
    if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'El enlace de recuperación no es válido o ha expirado.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
      hashedPassword,
      record.user_id,
    ]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [record.id]);
    await logAudit(record.user_id, 'auth.reset_password', {});

    res.json({
      success: true,
      message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
    });
  })
);

export default router;
