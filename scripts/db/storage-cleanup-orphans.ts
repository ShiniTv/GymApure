/**
 * Elimina objetos huérfanos en Supabase Storage (existen en bucket pero no en BD).
 * Por defecto dry-run. Usar --apply para borrar.
 *
 * Uso: npm run db:storage:cleanup
 *      npm run db:storage:cleanup -- --apply
 */
import 'dotenv/config';
import { createAuditPool, parseStorageRef } from './audit-lib.ts';
import {
  AVATARS_BUCKET,
  EQUIPMENT_PHOTOS_BUCKET,
  PAYMENT_PROOFS_BUCKET,
  VIDEOS_BUCKET,
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
} from '../../src/lib/supabaseAdmin.ts';

const apply = process.argv.includes('--apply');
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const pool = createAuditPool(databaseUrl);
const BUCKETS = [PAYMENT_PROOFS_BUCKET, AVATARS_BUCKET, VIDEOS_BUCKET, EQUIPMENT_PHOTOS_BUCKET];

async function collectDbReferences(): Promise<Map<string, Set<string>>> {
  const refs = new Map<string, Set<string>>();
  for (const bucket of BUCKETS) refs.set(bucket, new Set());

  const addRef = (ref: string | null) => {
    const parsed = parseStorageRef(ref);
    if (!parsed) return;
    refs.get(parsed.bucket)?.add(parsed.key);
  };

  const { rows: proofs } = await pool.query<{ proof_url: string | null }>(
    `SELECT proof_url FROM payments WHERE proof_url IS NOT NULL`
  );
  proofs.forEach((r) => addRef(r.proof_url));

  const { rows: avatars } = await pool.query<{ profile_image: string | null }>(
    `SELECT profile_image FROM users WHERE profile_image IS NOT NULL`
  );
  avatars.forEach((r) => addRef(r.profile_image));

  const { rows: exercises } = await pool.query<{
    video_url: string | null;
    video_poster_url: string | null;
  }>(`SELECT video_url, video_poster_url FROM exercises`);
  for (const row of exercises) {
    addRef(row.video_url);
    addRef(row.video_poster_url);
  }

  const { rows: equipment } = await pool.query<{ photo_url: string | null }>(
    `SELECT photo_url FROM gym_equipment WHERE photo_url IS NOT NULL`
  );
  equipment.forEach((r) => addRef(r.photo_url));

  return refs;
}

async function listObjects(bucket: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const keys: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list('', { limit: 1000, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      if (item.id) keys.push(item.name);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return keys;
}

async function main() {
  if (!isSupabaseStorageConfigured()) {
    console.error('Supabase Storage no configurado');
    process.exit(1);
  }

  console.log(apply ? 'Modo: APPLY (borrando huérfanos)' : 'Modo: dry-run (sin cambios)');
  const dbRefs = await collectDbReferences();
  const admin = getSupabaseAdmin();
  let totalRemoved = 0;

  for (const bucket of BUCKETS) {
    const objects = await listObjects(bucket);
    const referenced = dbRefs.get(bucket) ?? new Set();
    const orphans = objects.filter((key) => !referenced.has(key));

    console.log(`\n${bucket}: ${orphans.length} huérfano(s) de ${objects.length}`);
    if (orphans.length === 0) continue;

    if (apply) {
      const { error } = await admin.storage.from(bucket).remove(orphans);
      if (error) {
        console.error(`  Error: ${error.message}`);
        process.exit(1);
      }
      totalRemoved += orphans.length;
      console.log(`  ✓ Eliminados ${orphans.length}`);
    } else {
      orphans.slice(0, 10).forEach((k) => console.log(`  - ${k}`));
      if (orphans.length > 10) console.log(`  ... y ${orphans.length - 10} más`);
    }
  }

  console.log(
    apply
      ? `\nTotal eliminados: ${totalRemoved}`
      : '\nEjecuta con --apply para eliminar huérfanos'
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
