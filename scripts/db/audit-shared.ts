import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { config as loadDotenv } from 'dotenv';

export type AuditCheck = {
  name: string;
  ok: boolean;
  detail: string;
  value?: number | string;
};

export function createAuditPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 30_000,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
}

export async function auditQuery<T extends pg.QueryResultRow>(
  pool: pg.Pool,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await pool.query<T>(sql, params);
  return rows;
}

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url.replace(/^postgresql:/, 'postgres:'));
    if (parsed.password) parsed.password = '***';
    return parsed.toString().replace(/^postgres:/, 'postgresql:');
  } catch {
    return '(url inválida)';
  }
}

export function resolveEnvLabel(argv: string[]): 'dev' | 'prod' | 'active' {
  if (argv.includes('--prod')) return 'prod';
  if (argv.includes('--dev')) return 'dev';
  return 'active';
}

/** Carga .env base y el archivo del entorno antes de importar módulos que lean env.ts */
export function loadEnvFilesForLabel(label: 'dev' | 'prod' | 'active'): void {
  if (fs.existsSync(path.resolve('.env'))) {
    loadDotenv({ path: path.resolve('.env') });
  }
  if (label === 'dev' && fs.existsSync(path.resolve('.env.dev'))) {
    loadDotenv({ path: path.resolve('.env.dev'), override: true });
  } else if (label === 'prod' && fs.existsSync(path.resolve('.env.prod'))) {
    loadDotenv({ path: path.resolve('.env.prod'), override: true });
  }
}

export async function listAllStorageObjects(
  listFn: (
    prefix: string,
    opts: { limit: number; offset: number }
  ) => Promise<{
    data: Array<{ name: string; id?: string | null }> | null;
    error: { message: string } | null;
  }>
): Promise<string[]> {
  const keys: string[] = [];
  const limit = 100;

  async function walk(prefix: string): Promise<void> {
    let offset = 0;
    while (true) {
      const { data, error } = await listFn(prefix, { limit, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const item of data) {
        const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id == null) {
          await walk(itemPath);
        } else {
          keys.push(itemPath);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  await walk('');
  return keys;
}

export function loadConnectionString(label: 'dev' | 'prod' | 'active'): string {
  if (label === 'dev') {
    const devPath = path.resolve('.env.dev');
    if (!fs.existsSync(devPath)) {
      throw new Error('Falta .env.dev — ejecuta npm run db:setup:dev');
    }
    const content = fs.readFileSync(devPath, 'utf8');
    const match = /^DATABASE_URL=(.+)$/m.exec(content);
    if (!match?.[1]?.trim()) throw new Error('DATABASE_URL no definido en .env.dev');
    return match[1].trim().replace(/^["']|["']$/g, '');
  }

  if (label === 'prod') {
    const prodPath = path.resolve('.env.prod');
    if (!fs.existsSync(prodPath)) {
      throw new Error('Falta .env.prod');
    }
    const content = fs.readFileSync(prodPath, 'utf8');
    const match = /^DATABASE_URL=(.+)$/m.exec(content);
    if (!match?.[1]?.trim()) throw new Error('DATABASE_URL no definido en .env.prod');
    return match[1].trim().replace(/^["']|["']$/g, '');
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL no definido en el entorno activo');
  return url;
}

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

export const INTEGRITY_CHECKS: { name: string; sql: string }[] = [
  {
    name: 'payments sin user',
    sql: `SELECT COUNT(*)::text AS count FROM payments p
          LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL`,
  },
  {
    name: 'workout_logs sin session',
    sql: `SELECT COUNT(*)::text AS count FROM workout_logs wl
          LEFT JOIN workout_sessions ws ON ws.id = wl.session_id WHERE ws.id IS NULL`,
  },
  {
    name: 'subscriptions activas expiradas',
    sql: `SELECT COUNT(*)::text AS count FROM subscriptions
          WHERE status = 'active' AND end_date < CURRENT_DATE`,
  },
  {
    name: 'tokens reset expirados o usados',
    sql: `SELECT COUNT(*)::text AS count FROM password_reset_tokens
          WHERE expires_at < NOW() OR used_at IS NOT NULL`,
  },
  {
    name: 'user_routines sin user',
    sql: `SELECT COUNT(*)::text AS count FROM user_routines ur
          LEFT JOIN users u ON u.id = ur.user_id WHERE u.id IS NULL`,
  },
  {
    name: 'chat_messages sin conversation',
    sql: `SELECT COUNT(*)::text AS count FROM chat_messages cm
          LEFT JOIN chat_conversations cc ON cc.id = cm.conversation_id WHERE cc.id IS NULL`,
  },
];

export function printChecks(title: string, checks: AuditCheck[]): number {
  console.log(`\n=== ${title} ===`);
  let failed = 0;
  for (const check of checks) {
    const icon = check.ok ? '✓' : '✗';
    console.log(`${icon} ${check.name} — ${check.detail}`);
    if (!check.ok) failed += 1;
  }
  return failed;
}

export function listMigrationFiles(): string[] {
  const dir = path.join(process.cwd(), 'supabase', 'migrations');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}
