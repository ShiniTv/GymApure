import { query } from '../db/index.ts';
import { logger } from './logger.ts';

const DEFAULT_AUDIT_RETENTION_DAYS = 90;
const DEFAULT_NOTIF_LOG_RETENTION_DAYS = 180;

function parseRetentionDays(envKey: string, fallback: number): number {
  const raw = parseInt(process.env[envKey] ?? String(fallback), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(3650, Math.max(7, raw));
}

export interface DbMaintenanceResult {
  auditDeleted: number;
  notifLogDeleted: number;
  auditRetentionDays: number;
  notifLogRetentionDays: number;
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
  const auditRetentionDays = parseRetentionDays('AUDIT_LOG_RETENTION_DAYS', DEFAULT_AUDIT_RETENTION_DAYS);
  const notifLogRetentionDays = parseRetentionDays(
    'EXPIRY_NOTIF_LOG_RETENTION_DAYS',
    DEFAULT_NOTIF_LOG_RETENTION_DAYS
  );

  const audit = await query(
    `DELETE FROM audit_logs WHERE created_at < NOW() - ($1::text || ' days')::interval`,
    [auditRetentionDays]
  );
  const notifLog = await query(
    `DELETE FROM expiry_notification_log WHERE sent_at < NOW() - ($1::text || ' days')::interval`,
    [notifLogRetentionDays]
  );

  const result: DbMaintenanceResult = {
    auditDeleted: audit.rowCount ?? 0,
    notifLogDeleted: notifLog.rowCount ?? 0,
    auditRetentionDays,
    notifLogRetentionDays,
  };

  if (result.auditDeleted > 0 || result.notifLogDeleted > 0) {
    logger.info('Mantenimiento de BD', { ...result });
  }

  return result;
}
