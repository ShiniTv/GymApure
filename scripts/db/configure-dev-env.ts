/**
 * Sustituye CHANGEME en DATABASE_URL de .env.dev con DEV_DB_PASSWORD.
 * Uso: npm run env:configure-dev -- <password>
 *   o: set DEV_DB_PASSWORD=... && npm run env:configure-dev
 */
import fs from 'node:fs';
import path from 'node:path';
import { DEV_REF, DEV_DASHBOARD_URL } from '../lib/supabase-refs.ts';

const DEV_ENV = path.resolve('.env.dev');

function main() {
  const password =
    process.argv[2]?.trim() ||
    process.env.DEV_DB_PASSWORD?.trim() ||
    process.env.SUPABASE_DB_PASSWORD?.trim();

  if (!password || password === 'CHANGEME') {
    console.error('\n✗ Falta la contraseña de la base de datos de desarrollo.');
    console.error('  Supabase → GymApure – Desarrollo → Settings → Database → Reset password');
    console.error(`  ${DEV_DASHBOARD_URL}/settings/database`);
    console.error('\n  Luego: npm run env:configure-dev -- <tu-contraseña>\n');
    process.exit(1);
  }

  if (!fs.existsSync(DEV_ENV)) {
    console.error(`✗ Falta ${DEV_ENV}`);
    process.exit(1);
  }

  const encoded = encodeURIComponent(password);
  const databaseUrl = `postgresql://postgres.${DEV_REF}:${encoded}@aws-1-us-west-1.pooler.supabase.com:6543/postgres`;

  let text = fs.readFileSync(DEV_ENV, 'utf8');
  const upsert = (key: string, value: string) => {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  };

  upsert('DEV_DB_PASSWORD', password);
  upsert('DATABASE_URL', databaseUrl);

  fs.writeFileSync(DEV_ENV, text);
  console.log(`\n✓ .env.dev actualizado (ref: ${DEV_REF})\n`);
}

main();
