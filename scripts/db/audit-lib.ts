/**
 * Utilidades compartidas para scripts de auditoría de BD y Storage.
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';

export const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

export const LEGACY_GYM_SETTINGS_KEYS = [
  'email_notifications_enabled',
  'sms_notifications_enabled',
  'notify_members_email',
  'notify_members_sms',
  'notify_admin_email',
  'whatsapp_notifications_enabled',
  'notify_members_whatsapp',
  'notify_payment_events',
  'notify_admin_new_payment',
  'notify_routine_assigned',
] as const;

export const ACTIVE_GYM_SETTINGS_KEYS = [
  'expiry_alert_days',
  'equipment_inspection_alert_days',
  'exchange_rate_usd_override',
  'exchange_rate_usd_override_note',
] as const;

export function createAuditPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 30_000,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
}

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid url)';
  }
}

export function listMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function getPendingMigrations(pool: pg.Pool): Promise<string[]> {
  const files = listMigrationFiles();
  const { rows } = await pool.query<{ filename: string }>(
    `SELECT filename FROM schema_migrations ORDER BY filename`
  );
  const applied = new Set(rows.map((r) => r.filename));
  return files.filter((f) => !applied.has(f));
}

export interface IntegrityCheck {
  name: string;
  count: number;
  ok: boolean;
}

export async function runIntegrityChecks(pool: pg.Pool): Promise<IntegrityCheck[]> {
  const checks: Array<{ name: string; sql: string }> = [
    {
      name: 'payments sin user',
      sql: `SELECT COUNT(*)::int AS count FROM payments p
            LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL`,
    },
    {
      name: 'workout_logs sin session',
      sql: `SELECT COUNT(*)::int AS count FROM workout_logs wl
            LEFT JOIN workout_sessions ws ON ws.id = wl.session_id WHERE ws.id IS NULL`,
    },
    {
      name: 'subscriptions activas expiradas',
      sql: `SELECT COUNT(*)::int AS count FROM subscriptions
            WHERE status = 'active' AND end_date < CURRENT_DATE`,
    },
    {
      name: 'tokens reset expirados o usados',
      sql: `SELECT COUNT(*)::int AS count FROM password_reset_tokens
            WHERE expires_at < NOW() OR used_at IS NOT NULL`,
    },
    {
      name: 'push_subscriptions de usuarios inactivos',
      sql: `SELECT COUNT(*)::int AS count FROM push_subscriptions ps
            LEFT JOIN users u ON u.id = ps.user_id
            WHERE u.id IS NULL OR u.status != 'active'`,
    },
    {
      name: 'notificaciones leídas (>90d)',
      sql: `SELECT COUNT(*)::int AS count FROM user_notifications
            WHERE read_at IS NOT NULL AND read_at < NOW() - INTERVAL '90 days'`,
    },
  ];

  const results: IntegrityCheck[] = [];
  for (const check of checks) {
    const { rows } = await pool.query<{ count: number }>(check.sql);
    const count = rows[0]?.count ?? 0;
    results.push({ name: check.name, count, ok: count === 0 });
  }
  return results;
}

export function parseStorageRef(
  ref: string | null
): { bucket: string; key: string } | null {
  if (!ref) return null;
  if (ref.startsWith('sb:')) {
    return { bucket: 'payment-proofs', key: ref.slice(3) };
  }
  if (ref.startsWith('sbmedia:avatars:')) {
    return { bucket: 'avatars', key: ref.slice('sbmedia:avatars:'.length) };
  }
  if (ref.startsWith('sbmedia:videos:')) {
    return { bucket: 'exercise-videos', key: ref.slice('sbmedia:videos:'.length) };
  }
  if (ref.startsWith('sbmedia:equipment:')) {
    return { bucket: 'equipment-photos', key: ref.slice('sbmedia:equipment:'.length) };
  }
  return null;
}
