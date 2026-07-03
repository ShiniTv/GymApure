/**
 * Crea proyecto Supabase de desarrollo vía CLI (requiere `npx supabase login` previo).
 * Uso: npm run db:create-dev-project
 *
 * Tras crear el proyecto, rellena .env.dev con las credenciales que imprime este script.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PROD_REF } from '../lib/supabase-refs.ts';

const PROJECT_NAME = 'caribean-gym-dev';
const REGION = 'us-west-1';

function runSupabase(args: string[], json = false): { ok: boolean; stdout: string } {
  const result = spawnSync('npx', ['supabase', ...args, ...(json ? ['-o', 'json'] : [])], {
    encoding: 'utf8',
    shell: true,
  });
  const stdout = (result.stdout ?? '').trim();
  if (result.status !== 0) {
    console.error(result.stderr ?? stdout);
    return { ok: false, stdout };
  }
  return { ok: true, stdout };
}

function main() {
  console.log('\n── Crear proyecto Supabase de desarrollo ──\n');

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
      const projects = JSON.parse(existing.stdout) as Array<{ name: string; id: string; ref: string }>;
      const found = projects.find((p) => p.name === PROJECT_NAME || p.ref !== PROD_REF);
      const devProject = projects.find((p) => p.name === PROJECT_NAME);
      if (devProject && devProject.ref !== PROD_REF) {
        console.log(`\n✓ Ya existe "${PROJECT_NAME}" (ref: ${devProject.ref})`);
        console.log('  Obtén DATABASE_URL en Dashboard → Project Settings → Database → pooler 6543');
        console.log('  y SUPABASE_SERVICE_ROLE_KEY en Settings → API.\n');
        process.exit(0);
      }
      if (projects.some((p) => p.name === PROJECT_NAME)) {
        console.log(`\nProyecto "${PROJECT_NAME}" encontrado. Configura .env.dev manualmente.\n`);
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
    console.error('\n✗ No se pudo crear el proyecto. Créalo en https://supabase.com/dashboard/new\n');
    process.exit(1);
  }

  console.log('\n✓ Proyecto creado. Guarda la contraseña de la base de datos:');
  console.log(`  DB password: ${dbPassword}\n`);

  const projects = runSupabase(['projects', 'list'], true);
  if (projects.ok) {
    try {
      const list = JSON.parse(projects.stdout) as Array<{ name: string; ref: string }>;
      const dev = list.find((p) => p.name === PROJECT_NAME);
      if (dev) {
        console.log(`  Project ref: ${dev.ref}`);
        console.log(`  DATABASE_URL=postgresql://postgres.${dev.ref}:<password>@aws-0-${REGION}.pooler.supabase.com:6543/postgres`);
      }
    } catch {
      /* ok */
    }
  }

  const examplePath = path.resolve('.env.dev.example');
  const devPath = path.resolve('.env.dev');
  if (fs.existsSync(examplePath) && !fs.existsSync(devPath)) {
    fs.copyFileSync(examplePath, devPath);
    console.log(`\n→ Copiado .env.dev.example → .env.dev — complétalo y ejecuta npm run db:setup:dev\n`);
  } else {
    console.log('\n→ Rellena .env.dev y ejecuta: npm run db:setup:dev\n');
  }
}

main();
