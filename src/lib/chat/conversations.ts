import { query } from '../../db/index.ts';
import { toDbId } from '../ids.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from '../sqlLike.ts';
import {
  CHAT_CHANNEL_LABELS,
  type ChatConversationListItem,
  type ChatConversationRow,
  type ChatStaffChannel,
} from './types.ts';

const CONVERSATION_SELECT = `id, member_id, channel, last_message_at::text, created_at::text`;

function mapConversationRow(row: ChatConversationRow): ChatConversationRow {
  return {
    ...row,
    id: toDbId(row.id),
    member_id: toDbId(row.member_id),
    channel: row.channel,
  };
}

function mapConversationListItem(row: ChatConversationListItem): ChatConversationListItem {
  return {
    ...row,
    id: toDbId(row.id),
    member_id: toDbId(row.member_id),
    channel: row.channel,
    channel_label: row.channel_label || CHAT_CHANNEL_LABELS[row.channel],
    member_avatar: row.member_avatar ?? null,
    unread_count: toDbId(row.unread_count),
    days_remaining: row.days_remaining != null ? toDbId(row.days_remaining) : null,
  };
}

const LIST_ITEM_SELECT = `
       c.id,
       c.member_id,
       c.channel,
       CASE c.channel
         WHEN 'admin' THEN 'Administración'
         WHEN 'receptionist' THEN 'Recepción'
         WHEN 'trainer' THEN 'Entrenador'
         ELSE c.channel::text
       END AS channel_label,
       u.full_name AS member_name,
       u.cedula AS member_cedula,
       u.profile_image AS member_avatar,
       c.last_message_at::text AS last_message_at,
       lm.body AS last_message_preview,
       lm.kind AS last_message_kind,
       COALESCE(unread.cnt, 0)::int AS unread_count,
       sub.days_remaining,
       sub.membership_name`;

function memberUnreadLateral(forMemberViewer: boolean): string {
  if (forMemberViewer) {
    return `
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt
       FROM chat_messages m
       WHERE m.conversation_id = c.id
         AND m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id <> c.member_id)
     ) unread ON true`;
  }
  return `
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt
       FROM chat_messages m
       WHERE m.conversation_id = c.id
         AND m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id = c.member_id)
     ) unread ON true`;
}

const LAST_MESSAGE_LATERAL = `
     LEFT JOIN LATERAL (
       SELECT body, kind
       FROM chat_messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true`;

const SUBSCRIPTION_LATERAL = `
     LEFT JOIN LATERAL (
       SELECT
         GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining,
         m.name AS membership_name
       FROM subscriptions s
       JOIN memberships m ON m.id = s.membership_id
       WHERE s.user_id = c.member_id
         AND s.status = 'active'
         AND s.end_date >= CURRENT_DATE
       ORDER BY s.end_date ASC
       LIMIT 1
     ) sub ON true`;

export async function getOrCreateConversation(
  memberId: number,
  channel: ChatStaffChannel
): Promise<ChatConversationRow> {
  const normalizedMemberId = toDbId(memberId);
  const { rows: memberRows } = await query<{ id: number; role: string }>(
    `SELECT id, role FROM users WHERE id = $1`,
    [normalizedMemberId]
  );
  const member = memberRows[0];
  if (member?.role !== 'member') {
    throw Object.assign(new Error('Miembro no encontrado'), { status: 404 });
  }

  const { rows: existing } = await query<ChatConversationRow>(
    `SELECT ${CONVERSATION_SELECT}
     FROM chat_conversations WHERE member_id = $1 AND channel = $2`,
    [normalizedMemberId, channel]
  );
  if (existing[0]) return mapConversationRow(existing[0]);

  try {
    const { rows: created } = await query<ChatConversationRow>(
      `INSERT INTO chat_conversations (member_id, channel)
       VALUES ($1, $2)
       ON CONFLICT (member_id, channel) DO UPDATE SET member_id = EXCLUDED.member_id
       RETURNING ${CONVERSATION_SELECT}`,
      [normalizedMemberId, channel]
    );
    return mapConversationRow(created[0]);
  } catch (err) {
    const { rows: again } = await query<ChatConversationRow>(
      `SELECT ${CONVERSATION_SELECT}
       FROM chat_conversations WHERE member_id = $1 AND channel = $2`,
      [normalizedMemberId, channel]
    );
    if (again[0]) return mapConversationRow(again[0]);
    throw err;
  }
}

export async function getConversationById(
  conversationId: number
): Promise<ChatConversationRow | null> {
  const { rows } = await query<ChatConversationRow>(
    `SELECT ${CONVERSATION_SELECT}
     FROM chat_conversations WHERE id = $1`,
    [toDbId(conversationId)]
  );
  return rows[0] ? mapConversationRow(rows[0]) : null;
}

export async function listStaffConversations(
  search?: string,
  options?: {
    channel: ChatStaffChannel;
    trainerId?: number;
    expiringOnly?: boolean;
    unreadOnly?: boolean;
    alertDays?: number;
    page?: number;
    pageSize?: number;
  }
): Promise<{ items: ChatConversationListItem[]; total: number; page: number; pageSize: number }> {
  if (!options?.channel) {
    throw new Error('channel is required for staff conversation list');
  }

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  const params: unknown[] = [options.channel];
  const conditions: string[] = [`u.role = 'member'`, `c.channel = $1`];

  if (search?.trim()) {
    const pattern = toLikeContainsPattern(search);
    if (pattern) {
      params.push(pattern);
      conditions.push(
        `(u.full_name ILIKE $${params.length}${LIKE_ESCAPE_CLAUSE} OR u.cedula ILIKE $${params.length}${LIKE_ESCAPE_CLAUSE} OR u.email ILIKE $${params.length}${LIKE_ESCAPE_CLAUSE})`
      );
    }
  }

  if (options?.trainerId) {
    params.push(toDbId(options.trainerId));
    conditions.push(`c.member_id IN (
      SELECT DISTINCT ur.user_id FROM user_routines ur
      JOIN routines r ON r.id = ur.routine_id
      WHERE r.trainer_id = $${params.length}
    )`);
  }

  if (options?.expiringOnly) {
    const alertDays = options.alertDays ?? 7;
    params.push(alertDays);
    conditions.push(`EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = c.member_id
        AND s.status = 'active'
        AND s.end_date >= CURRENT_DATE
        AND s.end_date <= CURRENT_DATE + $${params.length}::int
    )`);
  }

  if (options?.unreadOnly) {
    conditions.push(`EXISTS (
      SELECT 1 FROM chat_messages m
      WHERE m.conversation_id = c.id
        AND m.read_at IS NULL
        AND (m.sender_id IS NULL OR m.sender_id = c.member_id)
    )`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const fromSql = `
     FROM chat_conversations c
     JOIN users u ON u.id = c.member_id
     ${LAST_MESSAGE_LATERAL}
     ${memberUnreadLateral(false)}
     ${SUBSCRIPTION_LATERAL}
     ${whereSql}`;

  const countParams = [...params];
  const listParams = [...params, pageSize, offset];

  const [countResult, listResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM chat_conversations c
       JOIN users u ON u.id = c.member_id
       ${whereSql}`,
      countParams
    ),
    query<ChatConversationListItem>(
      `SELECT
       ${LIST_ITEM_SELECT}
     ${fromSql}
     ORDER BY c.last_message_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    ),
  ]);

  return {
    items: listResult.rows.map(mapConversationListItem),
    total: parseInt(countResult.rows[0]?.count || '0', 10),
    page,
    pageSize,
  };
}

export async function listMemberConversations(
  memberId: number
): Promise<ChatConversationListItem[]> {
  const { rows } = await query<ChatConversationListItem>(
    `SELECT
       ${LIST_ITEM_SELECT}
     FROM chat_conversations c
     JOIN users u ON u.id = c.member_id
     ${LAST_MESSAGE_LATERAL}
     ${memberUnreadLateral(true)}
     ${SUBSCRIPTION_LATERAL}
     WHERE c.member_id = $1
     ORDER BY
       CASE c.channel
         WHEN 'receptionist' THEN 0
         WHEN 'admin' THEN 1
         WHEN 'trainer' THEN 2
         ELSE 3
       END,
       c.last_message_at DESC`,
    [toDbId(memberId)]
  );
  return rows.map(mapConversationListItem);
}

export async function getMemberConversationSummary(
  memberId: number,
  channel: ChatStaffChannel
): Promise<ChatConversationListItem> {
  const conversation = await getOrCreateConversation(memberId, channel);
  const { rows } = await query<ChatConversationListItem>(
    `SELECT
       ${LIST_ITEM_SELECT}
     FROM chat_conversations c
     JOIN users u ON u.id = c.member_id
     ${LAST_MESSAGE_LATERAL}
     ${memberUnreadLateral(true)}
     ${SUBSCRIPTION_LATERAL}
     WHERE c.id = $1`,
    [conversation.id]
  );
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error('No se pudo cargar la conversación del miembro'), {
      status: 500,
    });
  }
  return mapConversationListItem(row);
}

export async function touchConversation(conversationId: number): Promise<void> {
  await query(`UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`, [
    toDbId(conversationId),
  ]);
}
