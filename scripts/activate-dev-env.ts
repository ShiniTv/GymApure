/**
 * Copia DATABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.dev al .env activo.
 * Uso: npm run env:use-dev
 */
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const PROD_REF = 'ffjwvlcwhyskddqqojnp';
const devPath = path.resolve('.env.dev');
const envPath = path.resolve('.env');

if (!fs.existsSync(devPath)) {
  console.error('✗ Falta .env.dev — ejecuta npm run db:setup:dev');
  process.exit(1);
}

config({ path: devPath });
const devDb = process.env.DATABASE_URL?.trim();
const devKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!devDb || devDb.includes(PROD_REF) || devDb.includes('CHANGEME')) {
  console.error('✗ .env.dev no tiene DATABASE_URL de desarrollo válida');
  process.exit(1);
}
if (!devKey || devKey.includes('CHANGEME')) {
  console.error('✗ .env.dev no tiene SUPABASE_SERVICE_ROLE_KEY válida');
  process.exit(1);
}

let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function upsert(key: string, value: string): void {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(envText)) {
    envText = envText.replace(re, line);
  } else {
    envText = `${envText.trimEnd()}\n${line}\n`;
  }
}

upsert('DATABASE_URL', devDb);
upsert('SUPABASE_SERVICE_ROLE_KEY', devKey);

fs.writeFileSync(envPath, envText);
console.log('✓ .env actualizado con credenciales de desarrollo (.env.dev)');
console.log(`  ref: ${devDb.match(/postgres\.([^:]+)/)?.[1] ?? '?'}`);
