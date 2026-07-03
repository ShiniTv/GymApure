/**
 * Valida variables de entorno antes de migrar o desplegar a producción.
 * Uso: NODE_ENV=production npm run deploy:preflight
 */
import 'dotenv/config';
import { isSupabaseStorageConfigured } from '../../src/lib/supabaseAdmin.ts';

let failed = 0;

function ok(name: string, cond: boolean, hint?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
  } else {
    console.error(`  FAIL ${name}${hint ? ` — ${hint}` : ''}`);
    failed++;
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
  ok('CRON_SECRET definido (recomendado)', cron.length >= 16, 'openssl rand -base64 32');

  const exchange = process.env.VITE_EXCHANGE_RATE?.trim() ?? '';
  ok(
    'VITE_EXCHANGE_RATE definido (build-time)',
    exchange.length > 0,
    'Configurar en Render antes del build'
  );

  console.log('');
  if (failed === 0) {
    console.log('Preflight: OK — puedes ejecutar npm run db:migrate y desplegar.');
    process.exit(0);
  }
  console.error(`Preflight: ${failed} problema(s). Corrige .env antes de continuar.`);
  process.exit(1);
}

main();
