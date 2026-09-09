import { Queue, type ConnectionOptions } from 'bullmq';
import { env } from '../config/env.ts';
import { logger } from '../lib/logger.ts';

export const QUEUE_NAMES = {
  expiry: 'gymapure-expiry',
  exchangeRate: 'gymapure-exchange-rate',
  trainerReminders: 'gymapure-trainer-reminders',
  mail: 'gymapure-mail',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

let connection: ConnectionOptions | null = null;

export function getBullmqConnection(): ConnectionOptions | null {
  const url = env.REDIS_URL?.trim();
  if (!url) return null;
  connection ??= { url, maxRetriesPerRequest: null };
  return connection;
}

const queues = new Map<string, Queue>();

export function getQueue(name: QueueName): Queue | null {
  const conn = getBullmqConnection();
  if (!conn) return null;
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: conn });
    queues.set(name, q);
  }
  return q;
}

/** Enqueue a named job; returns false if Redis/queue unavailable (caller may run inline). */
export async function enqueueJob(
  queueName: QueueName,
  jobName: string,
  data: Record<string, unknown> = {},
  opts?: { jobId?: string; delay?: number }
): Promise<boolean> {
  const queue = getQueue(queueName);
  if (!queue) {
    logger.debug('Queue unavailable; job not enqueued', { queueName, jobName });
    return false;
  }
  await queue.add(jobName, data, {
    removeOnComplete: 100,
    removeOnFail: 50,
    jobId: opts?.jobId,
    delay: opts?.delay,
  });
  return true;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
