import { sendPushToUser } from '../pushNotifications.ts';
import { emitToUser } from '../wsServer.ts';
import { logger } from '../logger.ts';
import { getStaffUserIds, getUnreadCount, insertNotificationsBatch } from './repository.ts';
import { mapWithConcurrency } from '../runInBatches.ts';
import type { NotificationSeverity } from './types.ts';

export type { NotificationSeverity };

export interface CreateUserNotificationInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  href?: string;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
}

export interface CreateStaffNotificationInput {
  type: string;
  title: string;
  body: string;
  href?: string;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
}

const NOTIFY_CONCURRENCY = 5;

async function notifyUserChannels(
  userId: number,
  title: string,
  body: string,
  href: string
): Promise<void> {
  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, 'notification:new', { unreadCount });
  void sendPushToUser(userId, title, body, href).catch((err) => {
    logger.error('Push notification failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function createUserNotification(input: CreateUserNotificationInput): Promise<boolean> {
  const rows = await insertNotificationsBatch([input]);
  const row = rows[0];
  if (!row) return false;

  await notifyUserChannels(input.userId, input.title, input.body, input.href ?? '/');
  return true;
}

export async function createStaffNotification(
  input: CreateStaffNotificationInput
): Promise<number> {
  const staffIds = await getStaffUserIds();
  if (staffIds.length === 0) return 0;

  const inserted = await insertNotificationsBatch(
    staffIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      severity: input.severity,
      metadata: input.metadata,
      dedupeKey: input.dedupeKey,
    }))
  );

  if (inserted.length === 0) return 0;

  await mapWithConcurrency(
    inserted,
    async (row) => {
      await notifyUserChannels(row.user_id, row.title, row.body, row.href);
    },
    NOTIFY_CONCURRENCY
  );

  return inserted.length;
}
