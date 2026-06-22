import { query } from '../../db/index.ts';
import { getOrCreateConversation } from './conversations.ts';
import { insertSystemMessage } from './messages.ts';
import type { ChatEventType, ChatSystemAlertType } from './types.ts';

export interface PostSystemMessageOptions {
  memberId: number;
  eventType: ChatSystemAlertType;
  body: string;
  metadata?: Record<string, unknown>;
  subscriptionId?: number | null;
  metadataKey?: string | null;
  daysRemaining?: number | null;
}

async function wasLogged(
  eventType: ChatSystemAlertType,
  options: {
    subscriptionId?: number | null;
    memberId?: number;
    metadataKey?: string | null;
  }
): Promise<boolean> {
  if (eventType === 'expiring_soon' && options.subscriptionId) {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM chat_system_log
       WHERE subscription_id = $1 AND alert_type = 'expiring_soon'
         AND notification_date = CURRENT_DATE
       LIMIT 1`,
      [options.subscriptionId]
    );
    return Boolean(rows[0]);
  }

  if (eventType === 'expired' && options.subscriptionId) {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM chat_system_log
       WHERE subscription_id = $1 AND alert_type = 'expired'
       LIMIT 1`,
      [options.subscriptionId]
    );
    return Boolean(rows[0]);
  }

  if (options.metadataKey && options.memberId) {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM chat_system_log
       WHERE user_id = $1 AND alert_type = $2 AND metadata_key = $3
       LIMIT 1`,
      [options.memberId, eventType, options.metadataKey]
    );
    return Boolean(rows[0]);
  }

  return false;
}

async function logSystemMessage(options: PostSystemMessageOptions): Promise<void> {
  await query(
    `INSERT INTO chat_system_log (user_id, subscription_id, alert_type, days_remaining, metadata_key)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      options.memberId,
      options.subscriptionId ?? null,
      options.eventType,
      options.daysRemaining ?? null,
      options.metadataKey ?? null,
    ]
  );
}

export async function postSystemMessage(options: PostSystemMessageOptions): Promise<boolean> {
  const already = await wasLogged(options.eventType, {
    subscriptionId: options.subscriptionId,
    memberId: options.memberId,
    metadataKey: options.metadataKey,
  });
  if (already) return false;

  const conversation = await getOrCreateConversation(options.memberId);
  await insertSystemMessage(
    conversation.id,
    options.body,
    options.eventType as Exclude<ChatEventType, 'manual'>,
    options.metadata ?? {}
  );
  await logSystemMessage(options);
  return true;
}
