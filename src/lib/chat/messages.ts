import { query } from '../../db/index.ts';
import { toDbId } from '../ids.ts';
import { isStaffRole } from '../roles.ts';
import { touchConversation } from './conversations.ts';
import type { ChatMessageDto, ChatMessageRow } from './types.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function mapMessageRow(
  row: ChatMessageRow & {
    sender_name?: string | null;
    sender_role?: string | null;
  },
  viewerId: number
): ChatMessageDto {
  const normalizedViewerId = toDbId(viewerId);
  const senderId = row.sender_id != null ? toDbId(row.sender_id) : null;
  return {
    id: toDbId(row.id),
    conversation_id: toDbId(row.conversation_id),
    sender_id: senderId,
    sender_name: row.sender_name ?? null,
    sender_role: row.sender_role ?? null,
    body: row.body,
    kind: row.kind,
    event_type: row.event_type,
    metadata: row.metadata ?? {},
    read_at: row.read_at,
    edited_at: row.edited_at ?? null,
    created_at: row.created_at,
    is_mine: senderId === normalizedViewerId,
  };
}

export async function listMessages(
  conversationId: number,
  viewerId: number,
  options?: { before?: number; limit?: number }
): Promise<{ messages: ChatMessageDto[]; hasMore: boolean }> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, options?.limit ?? DEFAULT_LIMIT));
  const before = options?.before;

  const params: unknown[] = [toDbId(conversationId), limit + 1];
  let beforeClause = '';
  if (before != null) {
    params.push(before);
    beforeClause = `AND m.id < $3`;
  }

  const { rows } = await query<
    ChatMessageRow & { sender_name: string | null; sender_role: string | null }
  >(
    `SELECT
       m.id,
       m.conversation_id,
       m.sender_id,
       m.body,
       m.kind,
       m.event_type,
       m.metadata,
       m.read_at::text,
       m.edited_at::text,
       m.created_at::text,
       u.full_name AS sender_name,
       u.role AS sender_role
     FROM chat_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
       ${beforeClause}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT $2`,
    params
  );

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  return {
    messages: slice.reverse().map((row) => mapMessageRow(row, viewerId)),
    hasMore,
  };
}

export async function sendTextMessage(
  conversationId: number,
  senderId: number,
  body: string
): Promise<ChatMessageDto> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('El mensaje no puede estar vacío');
  }

  const { rows } = await query<
    ChatMessageRow & { sender_name: string | null; sender_role: string | null }
  >(
    `INSERT INTO chat_messages (conversation_id, sender_id, body, kind, event_type)
     VALUES ($1, $2, $3, 'text', 'manual')
     RETURNING
       id,
       conversation_id,
       sender_id,
       body,
       kind,
       event_type,
       metadata,
       read_at::text,
       edited_at::text,
       created_at::text,
       (SELECT full_name FROM users WHERE id = $2) AS sender_name,
       (SELECT role FROM users WHERE id = $2) AS sender_role`,
    [conversationId, toDbId(senderId), trimmed]
  );

  await touchConversation(conversationId);
  return mapMessageRow(rows[0], toDbId(senderId));
}

export async function editTextMessage(
  conversationId: number,
  messageId: number,
  editorId: number,
  body: string
): Promise<ChatMessageDto> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('El mensaje no puede estar vacío');
  }

  const { rows } = await query<
    ChatMessageRow & { sender_name: string | null; sender_role: string | null }
  >(
    `UPDATE chat_messages
     SET body = $4, edited_at = NOW()
     WHERE id = $2
       AND conversation_id = $1
       AND sender_id = $3
       AND kind = 'text'
       AND event_type = 'manual'
     RETURNING
       id,
       conversation_id,
       sender_id,
       body,
       kind,
       event_type,
       metadata,
       read_at::text,
       edited_at::text,
       created_at::text,
       (SELECT full_name FROM users WHERE id = sender_id) AS sender_name,
       (SELECT role FROM users WHERE id = sender_id) AS sender_role`,
    [toDbId(conversationId), toDbId(messageId), toDbId(editorId), trimmed]
  );

  if (!rows[0]) {
    throw Object.assign(new Error('No se puede editar este mensaje'), { status: 403 });
  }

  await touchConversation(conversationId);
  return mapMessageRow(rows[0], toDbId(editorId));
}

export async function deleteTextMessage(
  conversationId: number,
  messageId: number,
  deleterId: number
): Promise<void> {
  const { rowCount } = await query(
    `DELETE FROM chat_messages
     WHERE id = $2
       AND conversation_id = $1
       AND sender_id = $3
       AND kind = 'text'
       AND event_type = 'manual'`,
    [toDbId(conversationId), toDbId(messageId), toDbId(deleterId)]
  );

  if (!rowCount) {
    throw Object.assign(new Error('No se puede eliminar este mensaje'), { status: 403 });
  }

  await query(
    `UPDATE chat_conversations c
     SET last_message_at = COALESCE(
       (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id),
       c.created_at
     )
     WHERE c.id = $1`,
    [toDbId(conversationId)]
  );
}

export async function insertSystemMessage(
  conversationId: number,
  body: string,
  eventType: Exclude<import('./types.ts').ChatEventType, 'manual'>,
  metadata: Record<string, unknown> = {}
): Promise<ChatMessageDto> {
  const { rows } = await query<
    ChatMessageRow & { sender_name: string | null; sender_role: string | null }
  >(
    `INSERT INTO chat_messages (conversation_id, sender_id, body, kind, event_type, metadata)
     VALUES ($1, NULL, $2, 'system', $3, $4::jsonb)
     RETURNING
       id,
       conversation_id,
       sender_id,
       body,
       kind,
       event_type,
       metadata,
       read_at::text,
       created_at::text,
       NULL::text AS sender_name,
       NULL::text AS sender_role`,
    [conversationId, body, eventType, JSON.stringify(metadata)]
  );

  await touchConversation(conversationId);
  return mapMessageRow(rows[0], -1);
}

export async function markConversationRead(
  conversationId: number,
  memberId: number,
  readerRole: 'member' | 'staff'
): Promise<number> {
  if (readerRole === 'member') {
    const { rowCount } = await query(
      `UPDATE chat_messages m
       SET read_at = NOW()
       FROM chat_conversations c
       WHERE m.conversation_id = c.id
         AND c.id = $1
         AND c.member_id = $2
         AND m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id <> c.member_id)`,
      [toDbId(conversationId), toDbId(memberId)]
    );
    return rowCount ?? 0;
  }

  const { rowCount } = await query(
    `UPDATE chat_messages m
     SET read_at = NOW()
     FROM chat_conversations c
     WHERE m.conversation_id = c.id
       AND c.id = $1
       AND m.read_at IS NULL
       AND (m.sender_id IS NULL OR m.sender_id = c.member_id)`,
    [toDbId(conversationId)]
  );
  return rowCount ?? 0;
}

export async function getUnreadCountForUser(userId: number, role: string): Promise<number> {
  if (role === 'member') {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM chat_messages m
       JOIN chat_conversations c ON c.id = m.conversation_id
       WHERE c.member_id = $1
         AND m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id <> c.member_id)`,
      [toDbId(userId)]
    );
    return rows[0]?.count ?? 0;
  }

  if (isStaffRole(role)) {
    if (role === 'trainer') {
      const { rows } = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM chat_messages m
         JOIN chat_conversations c ON c.id = m.conversation_id
         WHERE m.read_at IS NULL
           AND (m.sender_id IS NULL OR m.sender_id = c.member_id)
           AND c.member_id IN (
             SELECT DISTINCT ur.user_id FROM user_routines ur
             JOIN routines r ON r.id = ur.routine_id
             WHERE r.trainer_id = $1
           )`,
        [toDbId(userId)]
      );
      return rows[0]?.count ?? 0;
    }

    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM chat_messages m
       JOIN chat_conversations c ON c.id = m.conversation_id
       WHERE m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id = c.member_id)`
    );
    return rows[0]?.count ?? 0;
  }

  return 0;
}
