import { Worker, type Job } from 'bullmq';
import { getBullmqConnection, QUEUE_NAMES, closeQueues } from './queues.ts';
import { runExpiryJob } from '../lib/chat/expiryChatJob.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { getActiveUsdRate, refreshBcvUsdRate } from '../lib/exchangeRate.ts';
import { runTrainerAppointmentReminders } from '../lib/trainerRemindersJob.ts';
import { logger } from '../lib/logger.ts';

async function handleExpiry(_job: Job): Promise<void> {
  await runDbMaintenanceIfDue();
  await runExpiryJob();
}

async function handleExchangeRate(_job: Job): Promise<void> {
  const active = await getActiveUsdRate();
  const today = new Date().toISOString().slice(0, 10);
  const needsRefresh = !active || (active.source === 'bcv' && active.effective_date < today);
  if (needsRefresh) {
    const result = await refreshBcvUsdRate();
    logger.info('Worker tasa BCV', { message: result.message, inserted: result.inserted });
  }
}

async function handleTrainerReminders(_job: Job): Promise<void> {
  const result = await runTrainerAppointmentReminders();
  if (result.sent > 0) logger.info('Worker recordatorios 1:1', result);
}

function handleMail(job: Job): Promise<void> {
  logger.info('Mail job received (noop until producers migrate)', {
    jobId: job.id,
    name: job.name,
  });
  return Promise.resolve();
}

export function startQueueWorkers(): Promise<Worker[]> {
  const connection = getBullmqConnection();
  if (!connection) {
    logger.warn('REDIS_URL ausente — workers BullMQ no iniciados; usar timers in-process');
    return Promise.resolve([]);
  }

  const workers: Worker[] = [
    new Worker(QUEUE_NAMES.expiry, handleExpiry, { connection, concurrency: 1 }),
    new Worker(QUEUE_NAMES.exchangeRate, handleExchangeRate, { connection, concurrency: 1 }),
    new Worker(QUEUE_NAMES.trainerReminders, handleTrainerReminders, {
      connection,
      concurrency: 1,
    }),
    new Worker(QUEUE_NAMES.mail, handleMail, { connection, concurrency: 2 }),
  ];

  for (const w of workers) {
    w.on('failed', (job, err) => {
      logger.error('Job failed', {
        queue: w.name,
        jobId: job?.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  logger.info('BullMQ workers started', { queues: workers.map((w) => w.name) });
  return Promise.resolve(workers);
}

export async function stopQueueWorkers(workers: Worker[]): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  await closeQueues();
}
