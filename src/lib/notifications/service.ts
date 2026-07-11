import { sendPushToUser } from '../pushNotifications.ts';
import { emitToUser } from '../wsServer.ts';
import { logger } from '../logger.ts';
import { mapWithConcurrency } from '../runInBatches.ts';
import {
  getStaffUserIds,
  getUnreadCount,
  getUnreadCounts,
  insertNotificationsBulk,
  type UserNotificationRow,
} from './repository.ts';
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
  href: string,
  unreadCount?: number
): Promise<void> {
  const count = unreadCount ?? (await getUnreadCount(userId));
  emitToUser(userId, 'notification:new', { unreadCount: count });
  void sendPushToUser(userId, title, body, href).catch((err) => {
    logger.error('Push notification failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function createUserNotification(input: CreateUserNotificationInput): Promise<boolean> {
  const rows = await insertNotificationsBulk([input]);
  if (!rows[0]) return false;

  await notifyUserChannels(input.userId, input.title, input.body, input.href ?? '/');
  return true;
}

export async function createStaffNotification(
  input: CreateStaffNotificationInput
): Promise<number> {
  const staffIds = await getStaffUserIds();
  if (staffIds.length === 0) return 0;

  const inserted = await insertNotificationsBulk(
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

  const unreadCounts = await getUnreadCounts(inserted.map((r) => r.user_id));
  await mapWithConcurrency(
    inserted,
    (row: UserNotificationRow) =>
      notifyUserChannels(
        row.user_id,
        input.title,
        input.body,
        input.href ?? '/',
        unreadCounts.get(row.user_id)
      ),
    NOTIFY_CONCURRENCY
  );

  return inserted.length;
}
