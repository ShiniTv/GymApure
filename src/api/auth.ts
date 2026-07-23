import { asyncRouter } from './middleware/asyncRouter.ts';
import crypto from 'crypto';
import { query } from '../db/index.ts';
import { authCookieOptions, clearAuthCookieOptions } from '../config/cookies.ts';
import { allowPublicRegister } from '../config/env.ts';
import {
  assertPasswordNotBreached,
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
import { invalidateSessionUserCache } from '../lib/sessionUserCache.ts';
import { checkLoginBlock, recordLoginAttempt, LOGIN_BLOCK_MINUTES } from '../lib/loginLockout.ts';
import { authRateLimiter, forgotPasswordRateLimiter } from './middleware/rateLimit.ts';
import { hashPassword, passwordHashNeedsRehash, verifyPassword } from '../lib/passwordHash.ts';
import { clearCsrfCookie, setCsrfCookie } from '../lib/csrf.ts';
import { requireCsrf } from './middleware/csrf.ts';
import mfaRoutes from './mfa.ts';

const router = asyncRouter();

router.get(
  '/config',
  asyncHandler(async (_req, res) => {
    res.json({ allowPublicRegister });
  })
);

/** MFA endpoints retained for a future re-enable; login no longer requires TOTP. */
router.use('/mfa', mfaRoutes);

router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    if (await checkLoginBlock(normalizedEmail)) {
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

    if (!user || !(await verifyPassword(password, user.password))) {
      await recordLoginAttempt(normalizedEmail, false);
      await logAudit(null, 'auth.login_failed', {
        email: normalizedEmail,
        ip: clientIp,
        reason: 'invalid_credentials',
      });
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    if (user.status !== 'active') {
      await recordLoginAttempt(normalizedEmail, false);
      await logAudit(Number(user.id), 'auth.login_failed', {
        email: normalizedEmail,
        ip: clientIp,
        reason: 'inactive_account',
      });
      res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
      return;
    }

    await recordLoginAttempt(normalizedEmail, true);

    const userId = Number(user.id);

    if (passwordHashNeedsRehash(user.password)) {
      const upgradedHash = await hashPassword(password);
      await query('UPDATE users SET password = $1 WHERE id = $2', [upgradedHash, userId]);
    }

    emitToUser(userId, 'session:revoked', { reason: 'login_elsewhere' });

    const session = await createLoginSession(userId);
    if (session.type === 'failure') {
      res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
      return;
    }

    res.cookie('token', session.token, authCookieOptions);
    setCsrfCookie(res);
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
  authRateLimiter,
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

    const [existingEmail, existingCedula] = await Promise.all([
      query('SELECT id FROM users WHERE email = $1', [normalizedEmail]),
      query('SELECT id FROM users WHERE cedula = $1', [normalizedCedula]),
    ]);
    if (existingEmail.rows.length > 0) {
      res.status(400).json({ error: 'Este correo ya está registrado' });
      return;
    }

    if (existingCedula.rows.length > 0) {
      res.status(400).json({ error: 'Esta cédula ya está registrada' });
      return;
    }

    const breachError = await assertPasswordNotBreached(password);
    if (breachError) {
      res.status(400).json({ error: breachError });
      return;
    }

    const hashedPassword = await hashPassword(password);
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
    setCsrfCookie(res);
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
  requireCsrf,
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
    clearCsrfCookie(res);
    res.json({ message: 'Sesión cerrada' });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    // No cookie: anonymous session probe (login page). 200 avoids Chrome console noise from 401.
    // Invalid/expired cookie still returns 401/403 so clients clear stale state.
    if (!token) {
      res.json({ user: null });
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
  requireCsrf,
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
    setCsrfCookie(res);
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
  requireCsrf,
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

    if (!(await verifyPassword(current_password, rows[0].password))) {
      res.status(401).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    if (await verifyPassword(new_password, rows[0].password)) {
      res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
      return;
    }

    const breachError = await assertPasswordNotBreached(new_password);
    if (breachError) {
      res.status(400).json({ error: breachError });
      return;
    }

    const hashedPassword = await hashPassword(new_password);
    await query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
      hashedPassword,
      userId,
    ]);
    invalidateSessionUserCache(userId);
    await logAudit(userId, 'auth.change_password', {});

    res.clearCookie('token', clearAuthCookieOptions);
    clearCsrfCookie(res);
    res.json({
      success: true,
      message: 'Contraseña actualizada. Inicia sesión de nuevo.',
    });
  })
);

router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
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
        if (process.env.NODE_ENV === 'development' && process.env.DEV_LOG_RESET_LINKS === 'true') {
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

    const breachError = await assertPasswordNotBreached(new_password);
    if (breachError) {
      res.status(400).json({ error: breachError });
      return;
    }

    const hashedPassword = await hashPassword(new_password);
    await query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
      hashedPassword,
      record.user_id,
    ]);
    invalidateSessionUserCache(record.user_id);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1', [
      record.user_id,
    ]);
    await logAudit(record.user_id, 'auth.reset_password', {});

    res.json({
      success: true,
      message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
    });
  })
);

export default router;
