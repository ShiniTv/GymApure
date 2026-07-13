import { runExpiryJob } from '../lib/chat/expiryChatJob.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { logger } from '../lib/logger.ts';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const STARTUP_DEFER_MS = 30_000;

function resolveIntervalMs(): number {
  const raw = parseInt(process.env.EXPIRY_CRON_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS), 10);
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runDbMaintenanceIfDue();
    await runExpiryJob();
  } catch (err) {
    console.error('[expiry-cron] Error:', err);
  } finally {
    running = false;
  }
}

export function startExpiryCron(): void {
  if (process.env.NODE_ENV !== 'production' && process.env.EXPIRY_CRON_IN_DEV !== 'true') {
    return;
  }

  const intervalMs = resolveIntervalMs();
  logger.info('Cron de vencimientos activo', { intervalMinutes: Math.round(intervalMs / 60_000) });
  setTimeout(() => void tick(), STARTUP_DEFER_MS);
  setInterval(() => void tick(), intervalMs);
}
