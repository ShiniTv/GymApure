import { runExpiryJob } from '../lib/notifications/expiryNotifier.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

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
  const intervalMs = resolveIntervalMs();
  console.log(`[expiry-cron] Activo — cada ${Math.round(intervalMs / 60_000)} min`);
  void tick();
  setInterval(() => void tick(), intervalMs);
}
