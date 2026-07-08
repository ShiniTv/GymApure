import { type NextFunction, type Response } from 'express';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize, AuthRequest } from './middleware/auth.ts';
import { getActiveUsdRate } from '../lib/exchangeRate.ts';
import { runExchangeRateRefreshNow } from '../jobs/exchangeRateCron.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

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

router.get('/', authorize(['admin', 'member', 'receptionist', 'trainer']), async (_req, res) => {
  try {
    const active = await getActiveUsdRate();
    if (!active) {
      return res.status(503).json({
        error: 'Tasa de cambio no disponible. Contacta al gimnasio.',
      });
    }
    res.json(active);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/refresh', authorizeCronOrAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await runExchangeRateRefreshNow();
    if (req.user) {
      await logAudit(req.user.id, 'exchange_rate.refresh', {
        inserted: result.inserted,
        effective_date: result.rate?.effective_date,
        rate: result.rate?.rate,
      });
    }
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(502).json({ error: message });
  }
});

export default router;
