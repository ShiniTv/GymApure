/**
 * Crea proyecto Supabase de staging vía CLI (requiere `npx supabase login` previo).
 * Uso: npm run db:create-staging-project
 *
 * Tras crear, completa .env.staging y ejecuta:
 *   npm run db:migrate:staging && npm run db:health:staging && npm run db:create-admin:staging
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_REF, PROD_REF } from '../lib/supabase-refs.ts';

const PROJECT_NAME = 'GymApure Staging';
const REGION = 'us-west-1';

function runSupabase(args: string[], json = false): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync('npx', ['supabase', ...args, ...(json ? ['-o', 'json'] : [])], {
    encoding: 'utf8',
    shell: true,
  });
  const stdout = (result.stdout ?? '').trim();
  const stderr = (result.stderr ?? '').trim();
  if (result.status !== 0) {
    console.error(stderr || stdout);
    return { ok: false, stdout, stderr };
  }
  return { ok: true, stdout, stderr };
}

function main() {
  console.log('\n── Crear proyecto Supabase de staging ──\n');

  const orgs = runSupabase(['orgs', 'list'], true);
  if (!orgs.ok) {
    console.error('\n✗ Ejecuta primero: npx supabase login\n');
    process.exit(1);
  }

  let orgId: string | undefined;
  try {
    const parsed = JSON.parse(orgs.stdout) as Array<{ id: string; name: string }>;
    orgId = parsed[0]?.id;
    if (orgId) console.log(`Organización: ${parsed[0].name} (${orgId})`);
  } catch {
    console.error('No se pudo leer organizaciones de Supabase');
    process.exit(1);
  }

  if (!orgId) {
    console.error('No hay organizaciones en tu cuenta Supabase');
    process.exit(1);
  }

  const existing = runSupabase(['projects', 'list'], true);
  if (existing.ok) {
    try {
      const projects = JSON.parse(existing.stdout) as Array<{ name: string; ref: string }>;
      const staging = projects.find(
        (p) =>
          p.name === PROJECT_NAME ||
          p.name.toLowerCase().includes('staging') ||
          (p.ref !== PROD_REF && p.ref !== DEV_REF && p.name.toLowerCase().includes('gymapure'))
      );
      const byName = projects.find((p) => p.name === PROJECT_NAME);
      if (byName) {
        console.log(`\n✓ Ya existe "${PROJECT_NAME}" (ref: ${byName.ref})`);
        console.log('  Completa .env.staging y ejecuta npm run db:migrate:staging\n');
        process.exit(0);
      }
      if (staging && staging.ref !== PROD_REF && staging.ref !== DEV_REF) {
        console.log(`\n✓ Proyecto staging candidato: "${staging.name}" (ref: ${staging.ref})`);
        console.log('  Completa .env.staging con ese ref.\n');
        process.exit(0);
      }
    } catch {
      /* continuar */
    }
  }

  const dbPassword = crypto.randomBytes(16).toString('base64url');
  console.log(`Creando "${PROJECT_NAME}" en ${REGION}…\n`);

  const created = runSupabase([
    'projects',
    'create',
    PROJECT_NAME,
    '--org-id',
    orgId,
    '--db-password',
    dbPassword,
    '--region',
    REGION,
    '--yes',
  ]);

  if (!created.ok) {
    console.error('\n✗ No se pudo crear el proyecto (¿límite del plan Free = 2 proyectos?).');
    console.error('  Alternativa: upgrade o pausar un proyecto no crítico en Dashboard.\n');
    process.exit(1);
  }

  console.log('\n✓ Proyecto creado. Guarda la contraseña de la base de datos:');
  console.log(`  DB password: ${dbPassword}\n`);

  let ref: string | undefined;
  const projects = runSupabase(['projects', 'list'], true);
  if (projects.ok) {
    try {
      const list = JSON.parse(projects.stdout) as Array<{ name: string; ref: string }>;
      const st = list.find((p) => p.name === PROJECT_NAME);
      if (st) {
        ref = st.ref;
        console.log(`  Project ref: ${st.ref}`);
        console.log(
          `  DATABASE_URL=postgresql://postgres.${st.ref}:${encodeURIComponent(dbPassword)}@aws-1-${REGION}.pooler.supabase.com:6543/postgres`
        );
      }
    } catch {
      /* ok */
    }
  }

  const examplePath = path.resolve('.env.staging.example');
  const stagingPath = path.resolve('.env.staging');
  if (fs.existsSync(examplePath)) {
    let content = fs.readFileSync(examplePath, 'utf8');
    if (ref) {
      content = content
        .replaceAll('CHANGEME_STAGING_REF', ref)
        .replace('STAGING_DB_PASSWORD=CHANGEME', `STAGING_DB_PASSWORD=${dbPassword}`)
        .replace(
          /DATABASE_URL=postgresql:\/\/postgres\.CHANGEME_STAGING_REF:CHANGEME@aws-0-us-west-1\.pooler\.supabase\.com:6543\/postgres/,
          `DATABASE_URL=postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-1-${REGION}.pooler.supabase.com:6543/postgres`
        )
        .replace(
          'JWT_SECRET=CHANGEME_GENERATE_WITH_openssl_rand_base64_48',
          `JWT_SECRET=${crypto.randomBytes(48).toString('base64')}`
        )
        .replace(
          'CRON_SECRET=CHANGEME_GENERATE_WITH_openssl_rand_base64_32',
          `CRON_SECRET=${crypto.randomBytes(32).toString('base64')}`
        );
    }
    fs.writeFileSync(stagingPath, content, 'utf8');
    console.log(`\n→ Escrito .env.staging (completa SUPABASE_SERVICE_ROLE_KEY desde Dashboard → API)`);
    console.log('  Luego: npm run db:migrate:staging && npm run db:health:staging\n');
  }
}

main();
