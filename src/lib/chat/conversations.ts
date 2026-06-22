import { query } from '../../db/index.ts';
import { toDbId } from '../ids.ts';
import type { ChatConversationListItem, ChatConversationRow } from './types.ts';

function mapConversationRow(row: ChatConversationRow): ChatConversationRow {
  return {
    ...row,
    id: toDbId(row.id),
    member_id: toDbId(row.member_id),
  };
}

function mapConversationListItem(row: ChatConversationListItem): ChatConversationListItem {
  return {
    ...row,
    id: toDbId(row.id),
    member_id: toDbId(row.member_id),
    unread_count: toDbId(row.unread_count),
    days_remaining: row.days_remaining != null ? toDbId(row.days_remaining) : null,
  };
}

export async function getOrCreateConversation(memberId: number): Promise<ChatConversationRow> {
  const normalizedMemberId = toDbId(memberId);
  const { rows: memberRows } = await query<{ id: number; role: string }>(
    `SELECT id, role FROM users WHERE id = $1`,
    [normalizedMemberId]
  );
  const member = memberRows[0];
  if (!member || member.role !== 'member') {
    throw new Error('Miembro no encontrado');
  }

  const { rows: existing } = await query<ChatConversationRow>(
    `SELECT id, member_id, last_message_at::text, created_at::text
     FROM chat_conversations WHERE member_id = $1`,
    [normalizedMemberId]
  );
  if (existing[0]) return mapConversationRow(existing[0]);

  const { rows: created } = await query<ChatConversationRow>(
    `INSERT INTO chat_conversations (member_id)
     VALUES ($1)
     RETURNING id, member_id, last_message_at::text, created_at::text`,
    [normalizedMemberId]
  );
  return mapConversationRow(created[0]);
}

export async function getConversationById(conversationId: number): Promise<ChatConversationRow | null> {
  const { rows } = await query<ChatConversationRow>(
    `SELECT id, member_id, last_message_at::text, created_at::text
     FROM chat_conversations WHERE id = $1`,
    [toDbId(conversationId)]
  );
  return rows[0] ? mapConversationRow(rows[0]) : null;
}

export async function listStaffConversations(
  search?: string,
  options?: { trainerId?: number }
): Promise<ChatConversationListItem[]> {
  const params: unknown[] = [];
  const conditions: string[] = [`u.role = 'member'`];

  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.cedula ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  if (options?.trainerId) {
    params.push(toDbId(options.trainerId));
    conditions.push(`c.member_id IN (
      SELECT DISTINCT ur.user_id FROM user_routines ur
      JOIN routines r ON r.id = ur.routine_id
      WHERE r.trainer_id = $${params.length}
    )`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query<ChatConversationListItem>(
    `SELECT
       c.id,
       c.member_id,
       u.full_name AS member_name,
       u.cedula AS member_cedula,
       c.last_message_at::text AS last_message_at,
       lm.body AS last_message_preview,
       lm.kind AS last_message_kind,
       COALESCE(unread.cnt, 0)::int AS unread_count,
       sub.days_remaining,
       sub.membership_name
     FROM chat_conversations c
     JOIN users u ON u.id = c.member_id
     LEFT JOIN LATERAL (
       SELECT body, kind
       FROM chat_messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt
       FROM chat_messages m
       WHERE m.conversation_id = c.id
         AND m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id = c.member_id)
     ) unread ON true
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
     ) sub ON true
     ${whereSql}
     ORDER BY c.last_message_at DESC`,
    params
  );

  return rows.map(mapConversationListItem);
}

export async function getMemberConversationSummary(memberId: number): Promise<ChatConversationListItem> {
  const conversation = await getOrCreateConversation(memberId);
  const { rows } = await query<ChatConversationListItem>(
    `SELECT
       c.id,
       c.member_id,
       u.full_name AS member_name,
       u.cedula AS member_cedula,
       c.last_message_at::text AS last_message_at,
       lm.body AS last_message_preview,
       lm.kind AS last_message_kind,
       COALESCE(unread.cnt, 0)::int AS unread_count,
       sub.days_remaining,
       sub.membership_name
     FROM chat_conversations c
     JOIN users u ON u.id = c.member_id
     LEFT JOIN LATERAL (
       SELECT body, kind
       FROM chat_messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt
       FROM chat_messages m
       WHERE m.conversation_id = c.id
         AND m.read_at IS NULL
         AND (m.sender_id IS NULL OR m.sender_id <> c.member_id)
     ) unread ON true
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
     ) sub ON true
     WHERE c.id = $1`,
    [conversation.id]
  );
  return mapConversationListItem(rows[0]);
}

export async function touchConversation(conversationId: number): Promise<void> {
  await query(`UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`, [toDbId(conversationId)]);
}
