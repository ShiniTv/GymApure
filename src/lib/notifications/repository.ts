import { query } from '../../db/index.ts';
import type { NotificationSeverity } from './types.ts';

export interface UserNotificationRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  severity: NotificationSeverity;
  metadata: Record<string, unknown>;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
}

export interface InsertNotificationInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  href?: string;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
}

export async function insertNotification(
  input: InsertNotificationInput
): Promise<UserNotificationRow | null> {
  const rows = await insertNotificationsBatch([input]);
  return rows[0] ?? null;
}

/** Bulk insert with dedupe — one round-trip for many notifications. */
export async function insertNotificationsBatch(
  inputs: InsertNotificationInput[]
): Promise<UserNotificationRow[]> {
  if (inputs.length === 0) return [];

  const userIds: number[] = [];
  const types: string[] = [];
  const titles: string[] = [];
  const bodies: string[] = [];
  const hrefs: string[] = [];
  const severities: string[] = [];
  const metadataJson: string[] = [];
  const dedupeKeys: (string | null)[] = [];

  for (const input of inputs) {
    userIds.push(input.userId);
    types.push(input.type);
    titles.push(input.title);
    bodies.push(input.body);
    hrefs.push(input.href ?? '/');
    severities.push(input.severity ?? 'info');
    metadataJson.push(JSON.stringify(input.metadata ?? {}));
    dedupeKeys.push(input.dedupeKey ?? null);
  }

  const { rows } = await query<UserNotificationRow>(
    `INSERT INTO user_notifications (user_id, type, title, body, href, severity, metadata, dedupe_key)
     SELECT user_id, type, title, body, href, severity, metadata::jsonb, dedupe_key
     FROM UNNEST(
       $1::int[],
       $2::text[],
       $3::text[],
       $4::text[],
       $5::text[],
       $6::text[],
       $7::text[],
       $8::text[]
     ) AS t(user_id, type, title, body, href, severity, metadata, dedupe_key)
     ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
     RETURNING *`,
    [userIds, types, titles, bodies, hrefs, severities, metadataJson, dedupeKeys]
  );
  return rows;
}

export async function listNotifications(
  userId: number,
  options: { page?: number; limit?: number; unreadOnly?: boolean }
): Promise<{ items: UserNotificationRow[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;
  const unreadOnly = options.unreadOnly ?? false;

  const whereClause = unreadOnly ? 'WHERE user_id = $1 AND read_at IS NULL' : 'WHERE user_id = $1';
  const params: (number | string)[] = [userId];

  const [countResult, listResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_notifications ${whereClause}`,
      params
    ),
    query<UserNotificationRow>(
      `SELECT id, user_id, type, title, body, href, severity, metadata, dedupe_key, read_at, created_at
       FROM user_notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [...params, limit, offset]
    ),
  ]);
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
  const { rows } = listResult;

  return { items: rows, total };
}

export async function getUnreadCount(userId: number): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM user_notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function markNotificationRead(
  userId: number,
  notificationId: number
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE user_notifications SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(userId: number): Promise<number> {
  const { rowCount } = await query(
    `UPDATE user_notifications SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return rowCount ?? 0;
}

export async function getStaffUserIds(): Promise<number[]> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM users WHERE role IN ('admin', 'receptionist') AND status = 'active'`
  );
  return rows.map((r) => r.id);
}
