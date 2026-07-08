import { type NextFunction, type Response } from 'express';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { authorize, AuthRequest } from './middleware/auth.ts';
import { getExpirySettings, updateExpirySettings } from '../lib/gymSettings.ts';
import {
  clearManualUsdOverride,
  getExchangeRateAdminView,
  setManualUsdOverride,
} from '../lib/exchangeRate.ts';
import { runExchangeRateRefreshNow } from '../jobs/exchangeRateCron.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { runExpiryJob } from '../lib/chat/expiryChatJob.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

const expirySettingsSchema = z.object({
  expiry_alert_days: z.coerce.number().int().min(1).max(90).optional(),
});

const exchangeRateSettingsSchema = z.object({
  override_rate: z.coerce.number().positive().max(10_000).optional().nullable(),
  override_note: z.string().trim().max(200).optional().nullable(),
  clear_override: z.boolean().optional(),
});

function authorizeCronOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const headerSecret =
    (typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'] : null) ??
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace(/^Bearer\s+/i, '')
      : null);

  if (cronSecret && headerSecret === cronSecret) {
    next();
    return;
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
    const settings = await updateExpirySettings(parsed.data);
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

router.get('/exchange-rate', authorize(['admin']), async (_req, res) => {
  try {
    const data = await getExchangeRateAdminView();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/exchange-rate', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = exchangeRateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    if (parsed.data.clear_override) {
      await clearManualUsdOverride();
      await logAudit(req.user!.id, 'settings.exchange_rate.clear_override', {});
    } else if (parsed.data.override_rate != null) {
      const active = await setManualUsdOverride(
        parsed.data.override_rate,
        parsed.data.override_note ?? ''
      );
      await logAudit(req.user!.id, 'settings.exchange_rate.override', {
        rate: active.rate,
        note: parsed.data.override_note ?? '',
      });
    } else {
      return res.status(400).json({ error: 'override_rate o clear_override requerido' });
    }

    const data = await getExchangeRateAdminView();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(400).json({ error: message });
  }
});

router.post('/exchange-rate/refresh', authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const result = await runExchangeRateRefreshNow();
    await logAudit(req.user!.id, 'settings.exchange_rate.refresh', {
      inserted: result.inserted,
      effective_date: result.rate?.effective_date,
      rate: result.rate?.rate,
    });
    const data = await getExchangeRateAdminView();
    res.json({ success: true, result, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(502).json({ error: message });
  }
});

export default router;
