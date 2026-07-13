import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_REF, PROD_REF } from '../lib/supabase-refs.ts';

type EnvLabel = 'dev' | 'prod' | 'ci' | 'unknown' | 'missing';

interface EnvFileStatus {
  file: string;
  exists: boolean;
  label: EnvLabel;
  ref: string | null;
}

function extractRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = /postgres\.([a-z0-9]+):/i.exec(url);
  return match?.[1] ?? null;
}

function classifyRef(ref: string | null): EnvLabel {
  if (!ref) return 'missing';
  if (ref === DEV_REF) return 'dev';
  if (ref === PROD_REF) return 'prod';
  if (ref === 'localhost' || ref.includes('localhost')) return 'ci';
  return 'unknown';
}

function readEnvFile(filePath: string): EnvFileStatus {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return { file: filePath, exists: false, label: 'missing', ref: null };
  }

  const parsed = config({ path: resolved });
  const url = parsed.parsed?.DATABASE_URL ?? process.env.DATABASE_URL;
  const ref = extractRef(typeof url === 'string' ? url : undefined);
  return { file: filePath, exists: true, label: classifyRef(ref), ref };
}

function labelText(label: EnvLabel): string {
  switch (label) {
    case 'dev':
      return 'DESARROLLO';
    case 'prod':
      return 'PRODUCCIÓN';
    case 'ci':
      return 'CI / local Postgres';
    case 'unknown':
      return 'desconocido';
    default:
      return '—';
  }
}

function main() {
  console.log('\n=== Verificación de entornos ===\n');

  const files = ['.env.dev', '.env.prod', '.env', '.env.backup'];
  for (const file of files) {
    const status = readEnvFile(file);
    if (!status.exists && file === '.env.backup') continue;
    const icon = status.exists ? '✓' : '·';
    const ref = status.ref ? `ref=${status.ref}` : 'sin DATABASE_URL';
    console.log(`  ${icon} ${file.padEnd(14)} ${status.exists ? labelText(status.label) : 'no existe'}  ${status.exists ? ref : ''}`);
  }

  const activeUrl = process.env.DATABASE_URL?.trim();
  if (activeUrl) {
    const ref = extractRef(activeUrl);
    console.log(`\n  Shell activo: ${labelText(classifyRef(ref))} (${ref ?? '?'})`);
  } else {
    console.log('\n  Shell activo: sin DATABASE_URL (normal antes de npm run dev)');
  }

  const dev = readEnvFile('.env.dev');
  const prod = readEnvFile('.env.prod');

  console.log('\n--- Recomendación ---');
  if (!dev.exists) {
    console.log('  ⚠ Crea .env.dev: npm run env:init');
  } else if (dev.label !== 'dev') {
    console.log('  ⚠ .env.dev no apunta al proyecto de desarrollo');
  } else {
    console.log('  ✓ Desarrollo: npm run dev  (usa .env.dev)');
  }

  if (prod.exists && prod.label === 'prod') {
    console.log('  ✓ Producción CLI: npm run db:migrate:prod  (usa .env.prod)');
  } else if (!prod.exists) {
    console.log('  · .env.prod opcional — npm run env:init lo crea desde .env si tenías prod');
  }

  if (fs.existsSync('.env')) {
    console.log('  ⚠ .env detectado — deprecado. Ejecuta npm run env:init para reorganizar.');
  }

  if (fs.existsSync('.env.backup')) {
    console.log('  ⚠ .env.backup detectado — copia temporal de env:init.');
    console.log('    Confirma que .env.dev y .env.prod están completos, luego elimínalo:');
    console.log('    Remove-Item .env.backup   (PowerShell)');
  }

  console.log('');
}

main();
