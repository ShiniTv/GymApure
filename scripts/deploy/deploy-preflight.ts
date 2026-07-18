/**
 * Valida variables de entorno antes de migrar o desplegar a producción.
 * Uso: NODE_ENV=production npm run deploy:preflight
 */
import 'dotenv/config';
import { isSupabaseStorageConfigured } from '../../src/lib/supabaseAdmin.ts';

let failed = 0;
let warnings = 0;

function ok(name: string, cond: boolean, hint?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
  } else {
    console.error(`  FAIL ${name}${hint ? ` — ${hint}` : ''}`);
    failed++;
  }
}

function warn(name: string, cond: boolean, hint?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
  } else {
    console.warn(`  WARN ${name}${hint ? ` — ${hint}` : ''}`);
    warnings++;
  }
}

function main() {
  console.log('=== Deploy preflight ===\n');

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  ok('NODE_ENV=production (recomendado para prod)', isProd, 'export NODE_ENV=production');

  const jwt = process.env.JWT_SECRET?.trim() ?? '';
  ok('JWT_SECRET definido (≥32 chars)', jwt.length >= 32, 'openssl rand -base64 48');

  const dbUrl = process.env.DATABASE_URL?.trim() ?? '';
  ok('DATABASE_URL definido', dbUrl.length > 0);
  ok(
    'DATABASE_URL usa pooler Supabase (:6543)',
    !dbUrl.includes('supabase') || dbUrl.includes(':6543'),
    'Project Settings → Database → Transaction pooler'
  );

  ok(
    'SUPABASE_SERVICE_ROLE_KEY configurado',
    isSupabaseStorageConfigured(),
    'Obligatorio en producción; ver .env.example'
  );

  const cron = process.env.CRON_SECRET?.trim() ?? '';
  ok('CRON_SECRET definido (obligatorio en producción)', cron.length >= 16, 'openssl rand -base64 32');

  const publicUrl = process.env.PUBLIC_APP_URL?.trim() ?? '';
  ok(
    'PUBLIC_APP_URL definido (HTTPS en producción)',
    !isProd || publicUrl.startsWith('https://'),
    'https://caribean-gym.onrender.com o tu dominio custom'
  );

  const redisUrl = process.env.REDIS_URL?.trim() ?? '';
  const sentryDsn = process.env.SENTRY_DSN?.trim() ?? '';
  const smtpHost = process.env.SMTP_HOST?.trim() ?? '';
  const sslCa = process.env.DATABASE_SSL_CA?.trim() ?? '';

  if (isProd) {
    ok(
      'REDIS_URL configurado (rate limit / lockout)',
      redisUrl.length > 0,
      'Render Key Value (caribean-gym-kv) o Upstash; ver render.yaml'
    );
    warn(
      'DATABASE_SSL_CA (TLS verificado a Postgres)',
      sslCa.length > 0,
      'Ruta al CA o PEM inline; ver docs/DEPLOY.md'
    );
    warn(
      'SENTRY_DSN (errores en producción)',
      sentryDsn.length > 0,
      'Crear proyecto Sentry Node y pegar DSN en Render'
    );
    warn(
      'SMTP_HOST (correos transaccionales)',
      smtpHost.length > 0,
      'Sin SMTP no hay reset de contraseña ni bienvenida'
    );

    const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
    const vapidSubject = process.env.VAPID_SUBJECT?.trim() ?? '';
    const vapidComplete = vapidPublic.length > 0 && vapidPrivate.length > 0 && vapidSubject.length > 0;
    warn(
      'VAPID_* completo (push con app cerrada)',
      vapidComplete,
      'npx web-push generate-vapid-keys → VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT'
    );
  } else {
    ok('REDIS_URL (opcional en dev)', true);
  }

  console.log('');
  if (failed === 0) {
    const warnNote = warnings > 0 ? ` (${warnings} aviso(s) no bloqueantes)` : '';
    console.log(`Preflight: OK${warnNote} — puedes ejecutar npm run db:migrate y desplegar.`);
    process.exit(0);
  }
  console.error(`Preflight: ${failed} problema(s). Corrige .env antes de continuar.`);
  process.exit(1);
}

main();
