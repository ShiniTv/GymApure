/**
 * Background worker: BullMQ consumers + cron tick publishers.
 * Start: PROCESS_ROLE=worker npm run worker
 * Local monolith keeps PROCESS_ROLE=all (default) on `npm run dev`.
 */
import 'dotenv/config';
import { initDb, pool } from './src/db/index.ts';
import { env } from './src/config/env.ts';
import { logger } from './src/lib/logger.ts';
import { configureEmail } from './src/lib/email.ts';
import { configurePush } from './src/lib/pushNotifications.ts';
import { enqueueJob, QUEUE_NAMES, getBullmqConnection } from './src/jobs/queues.ts';
import { startQueueWorkers, stopQueueWorkers } from './src/jobs/workerRuntime.ts';
import { startExpiryCron } from './src/jobs/expiryCron.ts';
import {
  startExchangeRateCron,
  ensureExchangeRateOnStartup,
} from './src/jobs/exchangeRateCron.ts';
import { startTrainerRemindersCron } from './src/jobs/trainerRemindersCron.ts';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

async function scheduleRepeatingJobs(): Promise<NodeJS.Timeout[]> {
  const timers: NodeJS.Timeout[] = [];
  const conn = getBullmqConnection();
  if (!conn) return timers;

  const tick = async (queue: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES], name: string) => {
    try {
      await enqueueJob(queue, name, {}, { jobId: `${name}-${Date.now()}` });
    } catch (err) {
      logger.error('Failed to enqueue cron job', {
        queue,
        name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Immediate enqueue after short defer, then hourly.
  const schedule = (
    queue: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES],
    name: string,
    deferMs: number
  ) => {
    setTimeout(() => void tick(queue, name), deferMs);
    timers.push(setInterval(() => void tick(queue, name), DEFAULT_INTERVAL_MS));
  };

  schedule(QUEUE_NAMES.expiry, 'expiry-tick', 30_000);
  schedule(QUEUE_NAMES.exchangeRate, 'exchange-tick', 60_000);
  schedule(QUEUE_NAMES.trainerReminders, 'trainer-reminders-tick', 75_000);
  logger.info('Worker cron publishers armed (BullMQ)');
  return timers;
}

async function main() {
  process.env.PROCESS_ROLE = process.env.PROCESS_ROLE?.trim() || 'worker';

  await initDb();
  configureEmail({
    host: env.SMTP_HOST ?? '',
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    user: env.SMTP_USER ?? '',
    pass: (env.SMTP_PASS ?? '').replace(/\s/g, ''),
    from: env.SMTP_FROM ?? '',
  });
  configurePush({
    publicKey: env.VAPID_PUBLIC_KEY ?? '',
    privateKey: env.VAPID_PRIVATE_KEY ?? '',
    subject: env.VAPID_SUBJECT ?? 'mailto:gymapure@localhost',
  });

  const workers = await startQueueWorkers();
  let timers: NodeJS.Timeout[] = [];

  if (workers.length > 0) {
    timers = await scheduleRepeatingJobs();
    await ensureExchangeRateOnStartup();
  } else {
    // Fallback: same in-process timers as the monolith when Redis is down.
    logger.warn('Fallback to in-process crons (no Redis)');
    await ensureExchangeRateOnStartup();
    startExpiryCron();
    startExchangeRateCron();
    startTrainerRemindersCron();
  }

  logger.info('Worker process ready', { role: process.env.PROCESS_ROLE });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} — worker shutting down`);
    for (const t of timers) clearInterval(t);
    await stopQueueWorkers(workers);
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Worker failed to start', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
