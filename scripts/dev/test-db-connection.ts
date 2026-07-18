import 'dotenv/config';
import pg from 'pg';
import { DEV_REF } from '../lib/supabase-refs.ts';
import { getScriptPgSslConfig } from '../lib/pgSsl.ts';

const password = process.env.DEV_DB_PASSWORD?.trim() || process.env.TEST_DB_PASSWORD?.trim() || '';
const ref = process.env.DEV_REF?.trim() || DEV_REF;
const candidates = [
  `postgresql://postgres.${ref}:${password}@aws-1-us-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${password}@aws-1-us-west-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`,
  `postgresql://postgres.${ref}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
];

async function tryUrl(label: string, url: string): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: getScriptPgSslConfig(url) });
  try {
    await pool.query('SELECT 1');
    console.log(`OK ${label}`);
    return true;
  } catch (err) {
    console.log(`FAIL ${label}: ${err instanceof Error ? err.message : err}`);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  if (!password) {
    console.error('Falta DEV_DB_PASSWORD en .env.dev (npm run env:configure-dev)');
    process.exit(1);
  }
  for (let i = 0; i < candidates.length; i++) {
    if (await tryUrl(`variant-${i + 1}`, candidates[i]!)) {
      console.log(`\nUsar: ${candidates[i]}\n`);
      process.exit(0);
    }
  }
  process.exit(1);
}

main();
