import { type NextFunction, type Response } from 'express';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { authorize, AuthRequest } from './middleware/auth.ts';
import {
  getExpirySettings,
  updateExpirySettings,
  type ExpirySettings,
} from '../lib/gymSettings.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { runExpiryJob } from '../lib/chat/expiryChatJob.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

const expirySettingsSchema = z.object({
  expiry_alert_days: z.coerce.number().int().min(1).max(90).optional(),
});

function authorizeCronOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const headerSecret =
    (typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'] : null) ??
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace(/^Bearer\s+/i, '')
      : null);

  if (cronSecret && headerSecret === cronSecret) {
    return next();
  }

  return authorize(['admin'])(req, res, next);
}

router.get('/expiry', authorize(['admin']), async (_req, res) => {
  try {
    const settings = await getExpirySettings();
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/expiry', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = expirySettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const settings = await updateExpirySettings(parsed.data as Partial<ExpirySettings>);
    invalidateAdminStatsCache();
    await logAudit(req.user!.id, 'settings.expiry.update', parsed.data);
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/expiry/run', authorizeCronOrAdmin, async (req: AuthRequest, res) => {
  try {
    const maintenance = await runDbMaintenanceIfDue();
    const result = await runExpiryJob();
    invalidateAdminStatsCache();
    if (req.user) {
      await logAudit(req.user.id, 'settings.expiry.run', { ...result, maintenance });
    }
    res.json({ success: true, result, maintenance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
