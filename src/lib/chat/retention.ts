import { query } from '../../db/index.ts';
import { logger } from '../logger.ts';
import { deleteChatAttachment } from './attachments.ts';

function attachmentUrlFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const attachment = (metadata as { attachment?: unknown }).attachment;
  if (!attachment || typeof attachment !== 'object') return null;
  const url = (attachment as { url?: unknown }).url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

/**
 * Deletes chat messages older than `retentionDays` and best-effort removes attachments.
 * Conversations are kept; `last_message_at` is refreshed.
 * Returns 0 when retentionDays <= 0 (disabled).
 */
export async function purgeExpiredChatMessages(retentionDays: number): Promise<number> {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return 0;

  const { rows: withAttachments } = await query<{ metadata: unknown }>(
    `SELECT metadata FROM chat_messages
     WHERE created_at < NOW() - ($1::text || ' days')::interval
       AND metadata IS NOT NULL
       AND metadata::text LIKE '%attachment%'`,
    [retentionDays]
  );

  const attachmentUrls = withAttachments
    .map((row) => attachmentUrlFromMetadata(row.metadata))
    .filter((url): url is string => Boolean(url));

  const deleted = await query<{ conversation_id: number }>(
    `DELETE FROM chat_messages
     WHERE created_at < NOW() - ($1::text || ' days')::interval
     RETURNING conversation_id`,
    [retentionDays]
  );

  const deletedCount = deleted.rowCount ?? 0;
  if (deletedCount === 0) return 0;

  const conversationIds = [...new Set(deleted.rows.map((r) => r.conversation_id))];
  if (conversationIds.length > 0) {
    await query(
      `UPDATE chat_conversations c
       SET last_message_at = COALESCE(
         (SELECT MAX(created_at) FROM chat_messages m WHERE m.conversation_id = c.id),
         c.created_at
       )
       WHERE c.id = ANY($1::int[])`,
      [conversationIds]
    );
  }

  for (const url of attachmentUrls) {
    try {
      await deleteChatAttachment(url);
    } catch (err) {
      logger.warn('Chat attachment cleanup failed during retention purge', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return deletedCount;
}
