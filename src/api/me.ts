import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import type { AuthRequest } from './middleware/auth.ts';
import { clearAuthCookieOptions } from '../config/cookies.ts';
import { CSRF_COOKIE_NAME, clearCsrfCookieOptions } from '../lib/csrf.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import { buildUserDataExport } from '../lib/privacy/dataExport.ts';
import { anonymizeAndDeactivateAccount } from '../lib/privacy/deleteAccount.ts';
import { logAudit } from '../lib/audit.ts';
import { AppError } from './middleware/errorHandler.ts';

const router = asyncRouter();

const deleteAccountSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Debes confirmar con confirm: true' }),
  }),
});

/** GET /api/me/data-export — portable copy of the caller's personal data. */
router.get('/data-export', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const payload = await buildUserDataExport(userId);
  await logAudit(userId, 'user.data_export', { target_id: userId });

  const filename = `gymapure-datos-${userId}-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).json(payload);
});

/**
 * POST /api/me/delete-account — self-service closure (deactivate + anonymize).
 * Body: { confirm: true }
 */
router.post('/delete-account', async (req: AuthRequest, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(formatZodError(parsed.error), 400);
  }

  const userId = req.user!.id;
  const result = await anonymizeAndDeactivateAccount(userId, userId);
  if (!result.ok) {
    throw new AppError(result.error, result.status);
  }

  res.clearCookie('token', clearAuthCookieOptions);
  res.clearCookie(CSRF_COOKIE_NAME, clearCsrfCookieOptions);
  res.json({ ok: true, message: 'Cuenta desactivada y datos personales anonimizados' });
});

export default router;
