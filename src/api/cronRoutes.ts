import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorizeCronOnly } from './middleware/cronAuth.ts';
import { runExpiryJob } from '../lib/chat/expiryChatJob.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { runExchangeRateRefreshNow } from '../jobs/exchangeRateCron.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

router.post('/cron/expiry/run', authorizeCronOnly, async (_req, res) => {
  try {
    const maintenance = await runDbMaintenanceIfDue();
    const result = await runExpiryJob();
    invalidateAdminStatsCache();
    await logAudit(null, 'settings.expiry.run', { ...result, maintenance, source: 'cron' });
    res.json({ success: true, result, maintenance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/cron/exchange-rate/refresh', authorizeCronOnly, async (_req, res) => {
  try {
    const result = await runExchangeRateRefreshNow();
    await logAudit(null, 'exchange_rate.refresh', {
      inserted: result.inserted,
      effective_date: result.rate?.effective_date,
      rate: result.rate?.rate,
      source: 'cron',
    });
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(502).json({ error: message });
  }
});

export default router;
