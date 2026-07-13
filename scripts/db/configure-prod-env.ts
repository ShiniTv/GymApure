/**
 * Actualiza DATABASE_URL de .env.prod tras rotar la contraseña en Supabase.
 * Uso: npm run env:configure-prod -- <password>
 */
import fs from 'node:fs';
import path from 'node:path';
import { PROD_REF, PROD_DASHBOARD_URL } from '../lib/supabase-refs.ts';

const PROD_ENV = path.resolve('.env.prod');

function extractPoolerHost(databaseUrl: string): string | null {
  const match = /@([^/]+)\//.exec(databaseUrl);
  return match?.[1] ?? null;
}

function buildDatabaseUrl(password: string, poolerHost: string): string {
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres.${PROD_REF}:${encoded}@${poolerHost}/postgres`;
}

function main() {
  const password =
    process.argv[2]?.trim() ||
    process.env.PROD_DB_PASSWORD?.trim() ||
    process.env.SUPABASE_DB_PASSWORD?.trim();

  if (!password || password === 'CHANGEME') {
    console.error('\n✗ Falta la contraseña de la base de datos de producción.');
    console.error('  Supabase → GymApure – Producción → Settings → Database → Reset password');
    console.error(`  ${PROD_DASHBOARD_URL}/settings/database`);
    console.error('\n  Luego: npm run env:configure-prod -- <nueva-contraseña>\n');
    process.exit(1);
  }

  if (!fs.existsSync(PROD_ENV)) {
    console.error(`✗ Falta ${PROD_ENV} — copia desde .env.prod.example`);
    process.exit(1);
  }

  let text = fs.readFileSync(PROD_ENV, 'utf8');
  const currentUrl = /^DATABASE_URL=(.*)$/m.exec(text)?.[1]?.trim();
  const poolerHost =
    (currentUrl ? extractPoolerHost(currentUrl) : null) ??
    'aws-1-us-west-1.pooler.supabase.com:6543';

  const databaseUrl = buildDatabaseUrl(password, poolerHost);

  const upsert = (key: string, value: string) => {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  };

  upsert('PROD_DB_PASSWORD', password);
  upsert('DATABASE_URL', databaseUrl);

  fs.writeFileSync(PROD_ENV, text);

  console.log(`\n✓ .env.prod actualizado (ref: ${PROD_REF})`);
  console.log('\n--- Copiar en Render → Environment → DATABASE_URL ---\n');
  console.log(databaseUrl);
  console.log('\n  Save → Manual Deploy');
  console.log('  Verificar: npm run db:health:prod\n');
}

main();
