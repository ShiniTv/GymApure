import { logger } from '../lib/logger.ts';
import { runTrainerAppointmentReminders } from '../lib/trainerRemindersJob.ts';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const STARTUP_DEFER_MS = 45_000;

function resolveIntervalMs(): number {
  const raw = parseInt(
    process.env.TRAINER_REMINDERS_CRON_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS),
    10
  );
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runTrainerAppointmentReminders();
    if (result.sent > 0) logger.info('Recordatorios 1:1 enviados', result);
  } catch (err) {
    logger.error('Error en cron de recordatorios 1:1', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    running = false;
  }
}

export function startTrainerRemindersCron(): void {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.TRAINER_REMINDERS_CRON_IN_DEV !== 'true'
  ) {
    return;
  }

  const intervalMs = resolveIntervalMs();
  logger.info('Cron de recordatorios 1:1 activo', {
    intervalMinutes: Math.round(intervalMs / 60_000),
  });
  setTimeout(() => void tick(), STARTUP_DEFER_MS);
  setInterval(() => void tick(), intervalMs);
}
