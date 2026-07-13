import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorizeCronOrAdmin } from './middleware/cronAuth.ts';
import type { AuthRequest } from './middleware/authTypes.ts';
import { runExpiryJob } from '../lib/chat/expiryChatJob.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { runExchangeRateRefreshNow } from '../jobs/exchangeRateCron.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

router.post('/settings/expiry/run', authorizeCronOrAdmin, async (req: AuthRequest, res) => {
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

router.post('/exchange-rate/refresh', authorizeCronOrAdmin, async (req: AuthRequest, res) => {
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
