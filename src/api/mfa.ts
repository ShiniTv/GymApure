import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authenticate, authorize, type AuthRequest } from './middleware/auth.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { logAudit } from '../lib/audit.ts';
import { authCookieOptions } from '../config/cookies.ts';
import { createLoginSession } from '../lib/sessionAuth.ts';
import { emitToUser } from '../lib/wsServer.ts';
import { setCsrfCookie } from '../lib/csrf.ts';
import { verifyPassword } from '../lib/passwordHash.ts';
import { mfaVerifyRateLimiter } from './middleware/rateLimit.ts';
import {
  buildMfaQrDataUrl,
  disableMfa,
  enableMfa,
  generateMfaSecret,
  getUserMfaState,
  MFA_STAFF_ROLES,
  savePendingMfaSecret,
  verifyMfaChallengeToken,
  verifyMfaToken,
} from '../lib/mfa.ts';

const router = asyncRouter();

const mfaCodeSchema = z.object({
  code: z.string().trim().min(6).max(8),
});

const mfaDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().trim().min(6).max(8),
});

router.post(
  '/verify-login',
  mfaVerifyRateLimiter,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      mfa_challenge_token: z.string().min(1),
      code: z.string().trim().min(6).max(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos MFA inválidos' });
      return;
    }

    const challenge = verifyMfaChallengeToken(parsed.data.mfa_challenge_token);
    if (!challenge) {
      res.status(401).json({ error: 'Desafío MFA expirado. Inicia sesión de nuevo.' });
      return;
    }

    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const state = await getUserMfaState(challenge.userId);
    if (!state.mfa_enabled || !state.mfa_secret) {
      res.status(400).json({ error: 'MFA no está activo para esta cuenta' });
      return;
    }

    if (!verifyMfaToken(state.mfa_secret, parsed.data.code)) {
      await logAudit(challenge.userId, 'auth.mfa_login_failed', { ip: clientIp });
      res.status(401).json({ error: 'Código MFA incorrecto' });
      return;
    }

    emitToUser(challenge.userId, 'session:revoked', { reason: 'login_elsewhere' });
    const session = await createLoginSession(challenge.userId);
    if (session.type === 'failure') {
      res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
      return;
    }

    res.cookie('token', session.token, authCookieOptions);
    setCsrfCookie(res);
    await logAudit(challenge.userId, 'auth.login', { ip: clientIp, mfa: true });

    res.json({
      user: {
        id: challenge.userId,
        email: session.user.email,
        role: session.user.role,
        name: session.user.full_name,
      },
    });
  })
);

router.get(
  '/status',
  authenticate,
  authorize(MFA_STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const state = await getUserMfaState(req.user!.id);
    res.json({
      mfa_enabled: state.mfa_enabled,
      mfa_pending: Boolean(state.mfa_secret && !state.mfa_enabled),
      role: req.user!.role,
    });
  })
);

router.post(
  '/setup',
  authenticate,
  authorize(MFA_STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const secret = generateMfaSecret();
    await savePendingMfaSecret(req.user!.id, secret);
    const qr_data_url = await buildMfaQrDataUrl(req.user!.email, secret);
    await logAudit(req.user!.id, 'auth.mfa.setup_started', {});
    res.json({
      secret,
      qr_data_url,
      manual_entry_key: secret,
    });
  })
);

router.post(
  '/enable',
  authenticate,
  authorize(MFA_STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = mfaCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Código MFA inválido' });
      return;
    }

    const state = await getUserMfaState(req.user!.id);
    if (!state.mfa_secret) {
      res.status(400).json({ error: 'Inicia la configuración MFA primero' });
      return;
    }

    if (!verifyMfaToken(state.mfa_secret, parsed.data.code)) {
      res.status(401).json({ error: 'Código incorrecto. Verifica la hora de tu dispositivo.' });
      return;
    }

    await enableMfa(req.user!.id, state.mfa_secret);
    await logAudit(req.user!.id, 'auth.mfa.enabled', {});
    res.json({ success: true, mfa_enabled: true });
  })
);

router.post(
  '/disable',
  authenticate,
  authorize(MFA_STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = mfaDisableSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    const state = await getUserMfaState(req.user!.id);
    if (!state.mfa_enabled || !state.mfa_secret) {
      res.status(400).json({ error: 'MFA no está activo' });
      return;
    }

    const { query } = await import('../db/index.ts');
    const { rows } = await query<{ password: string }>('SELECT password FROM users WHERE id = $1', [
      req.user!.id,
    ]);
    if (!rows[0] || !(await verifyPassword(parsed.data.password, rows[0].password))) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }

    if (!verifyMfaToken(state.mfa_secret, parsed.data.code)) {
      res.status(401).json({ error: 'Código MFA incorrecto' });
      return;
    }

    await disableMfa(req.user!.id);
    await logAudit(req.user!.id, 'auth.mfa.disabled', {});
    res.json({ success: true, mfa_enabled: false });
  })
);

export default router;
