import { query } from '../db/index.ts';
import { logger } from './logger.ts';
import { syncEquipmentInspectionAlerts } from './equipmentInspectionAlerts.ts';
import { getChatRetentionSettings } from './gymSettings.ts';
import { purgeExpiredChatMessages } from './chat/retention.ts';

const DEFAULT_AUDIT_RETENTION_DAYS = 90;
const DEFAULT_NOTIF_LOG_RETENTION_DAYS = 180;
const DEFAULT_READ_NOTIF_RETENTION_DAYS = 90;
const DEFAULT_RESET_TOKEN_RETENTION_DAYS = 7;
const DEFAULT_PUSH_SUBSCRIPTION_RETENTION_DAYS = 90;

function parseRetentionDays(envKey: string, fallback: number): number {
  const raw = parseInt(process.env[envKey] ?? String(fallback), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(3650, Math.max(7, raw));
}

export interface DbMaintenanceResult {
  auditDeleted: number;
  notifLogDeleted: number;
  readNotificationsDeleted: number;
  resetTokensDeleted: number;
  pushSubscriptionsDeleted: number;
  chatMessagesDeleted: number;
  auditRetentionDays: number;
  notifLogRetentionDays: number;
  readNotificationsRetentionDays: number;
  resetTokenRetentionDays: number;
  pushSubscriptionRetentionDays: number;
  chatMessageRetentionDays: number;
}

let lastMaintenanceDay = '';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ejecuta limpieza como máximo una vez por día (UTC). */
export async function runDbMaintenanceIfDue(): Promise<DbMaintenanceResult | null> {
  const day = todayKey();
  if (lastMaintenanceDay === day) return null;
  lastMaintenanceDay = day;
  return runDbMaintenance();
}

export async function runDbMaintenance(): Promise<DbMaintenanceResult> {
  const auditRetentionDays = parseRetentionDays(
    'AUDIT_LOG_RETENTION_DAYS',
    DEFAULT_AUDIT_RETENTION_DAYS
  );
  const notifLogRetentionDays = parseRetentionDays(
    'EXPIRY_NOTIF_LOG_RETENTION_DAYS',
    DEFAULT_NOTIF_LOG_RETENTION_DAYS
  );
  const readNotificationsRetentionDays = parseRetentionDays(
    'READ_NOTIFICATIONS_RETENTION_DAYS',
    DEFAULT_READ_NOTIF_RETENTION_DAYS
  );
  const resetTokenRetentionDays = parseRetentionDays(
    'RESET_TOKEN_RETENTION_DAYS',
    DEFAULT_RESET_TOKEN_RETENTION_DAYS
  );
  const pushSubscriptionRetentionDays = parseRetentionDays(
    'PUSH_SUBSCRIPTION_RETENTION_DAYS',
    DEFAULT_PUSH_SUBSCRIPTION_RETENTION_DAYS
  );

  const chatRetention = await getChatRetentionSettings();
  const chatMessageRetentionDays = chatRetention.chat_message_retention_days;

  // Run retention deletes sequentially to avoid saturating the PG pool during cron + API traffic.
  const audit = await query(
    `DELETE FROM audit_logs WHERE created_at < NOW() - ($1::text || ' days')::interval`,
    [auditRetentionDays]
  );
  const notifLog = await query(
    `DELETE FROM chat_system_log WHERE sent_at < NOW() - ($1::text || ' days')::interval`,
    [notifLogRetentionDays]
  );
  const readNotifications = await query(
    `DELETE FROM user_notifications
       WHERE read_at IS NOT NULL
         AND read_at < NOW() - ($1::text || ' days')::interval`,
    [readNotificationsRetentionDays]
  );
  const resetTokens = await query(
    `DELETE FROM password_reset_tokens
       WHERE expires_at < NOW() - ($1::text || ' days')::interval
          OR (used_at IS NOT NULL AND used_at < NOW() - ($1::text || ' days')::interval)`,
    [resetTokenRetentionDays]
  );
  const pushSubscriptions = await query(
    `DELETE FROM push_subscriptions
       WHERE updated_at < NOW() - ($1::text || ' days')::interval`,
    [pushSubscriptionRetentionDays]
  );
  const chatMessagesDeleted = await purgeExpiredChatMessages(chatMessageRetentionDays);

  const result: DbMaintenanceResult = {
    auditDeleted: audit.rowCount ?? 0,
    notifLogDeleted: notifLog.rowCount ?? 0,
    readNotificationsDeleted: readNotifications.rowCount ?? 0,
    resetTokensDeleted: resetTokens.rowCount ?? 0,
    pushSubscriptionsDeleted: pushSubscriptions.rowCount ?? 0,
    chatMessagesDeleted,
    auditRetentionDays,
    notifLogRetentionDays,
    readNotificationsRetentionDays,
    resetTokenRetentionDays,
    pushSubscriptionRetentionDays,
    chatMessageRetentionDays,
  };

  if (
    result.auditDeleted > 0 ||
    result.notifLogDeleted > 0 ||
    result.readNotificationsDeleted > 0 ||
    result.resetTokensDeleted > 0 ||
    result.pushSubscriptionsDeleted > 0 ||
    result.chatMessagesDeleted > 0
  ) {
    logger.info('Mantenimiento de BD', { ...result });
  }

  void syncEquipmentInspectionAlerts().catch((err) => {
    logger.warn('Equipment inspection alerts sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return result;
}
