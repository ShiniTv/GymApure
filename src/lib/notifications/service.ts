import { sendPushToUser } from '../pushNotifications.ts';
import { emitToUser } from '../wsServer.ts';
import { logger } from '../logger.ts';
import { getStaffUserIds, getUnreadCount, insertNotification } from './repository.ts';
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
  const row = await insertNotification(input);
  if (!row) return false;

  await notifyUserChannels(input.userId, input.title, input.body, input.href ?? '/');
  return true;
}

export async function createStaffNotification(
  input: CreateStaffNotificationInput
): Promise<number> {
  const staffIds = await getStaffUserIds();
  let created = 0;

  for (const userId of staffIds) {
    const row = await insertNotification({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      severity: input.severity,
      metadata: input.metadata,
      dedupeKey: input.dedupeKey,
    });
    if (!row) continue;
    created += 1;
    await notifyUserChannels(userId, input.title, input.body, input.href ?? '/');
  }

  return created;
}
