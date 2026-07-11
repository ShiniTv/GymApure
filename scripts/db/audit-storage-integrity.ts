/**
 * Compara objetos Supabase Storage con referencias en la BD.
 * Uso: npm run db:audit:storage
 *      npm run db:audit:storage:dev
 *      npm run db:audit:storage:prod
 *
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */
import 'dotenv/config';
import { createAuditPool, maskDatabaseUrl, parseStorageRef } from './audit-lib.ts';
import {
  AVATARS_BUCKET,
  EQUIPMENT_PHOTOS_BUCKET,
  PAYMENT_PROOFS_BUCKET,
  VIDEOS_BUCKET,
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
} from '../../src/lib/supabaseAdmin.ts';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const dbUrl: string = databaseUrl;
const envLabel = process.env.AUDIT_ENV_LABEL ?? 'default';
const pool = createAuditPool(dbUrl);

const BUCKETS = [
  PAYMENT_PROOFS_BUCKET,
  AVATARS_BUCKET,
  VIDEOS_BUCKET,
  EQUIPMENT_PHOTOS_BUCKET,
] as const;

async function listAllObjects(bucket: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const keys: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`List ${bucket}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.id) keys.push(item.name);
    }
    if (data.length < limit) break;
    offset += limit;
  }

  return keys;
}

async function collectDbReferences(): Promise<Map<string, Set<string>>> {
  const refs = new Map<string, Set<string>>();
  for (const bucket of BUCKETS) {
    refs.set(bucket, new Set());
  }

  const addRef = (ref: string | null) => {
    const parsed = parseStorageRef(ref);
    if (!parsed) return;
    refs.get(parsed.bucket)?.add(parsed.key);
  };

  const { rows: proofs } = await pool.query<{ proof_url: string | null }>(
    `SELECT proof_url FROM payments WHERE proof_url IS NOT NULL AND proof_url != ''`
  );
  proofs.forEach((r) => addRef(r.proof_url));

  const { rows: avatars } = await pool.query<{ profile_image: string | null }>(
    `SELECT profile_image FROM users WHERE profile_image IS NOT NULL AND profile_image != ''`
  );
  avatars.forEach((r) => addRef(r.profile_image));

  const { rows: exercises } = await pool.query<{
    video_url: string | null;
    video_poster_url: string | null;
  }>(
    `SELECT video_url, video_poster_url FROM exercises
     WHERE video_url IS NOT NULL OR video_poster_url IS NOT NULL`
  );
  for (const row of exercises) {
    addRef(row.video_url);
    addRef(row.video_poster_url);
  }

  const { rows: equipment } = await pool.query<{ photo_url: string | null }>(
    `SELECT photo_url FROM gym_equipment WHERE photo_url IS NOT NULL AND photo_url != ''`
  );
  equipment.forEach((r) => addRef(r.photo_url));

  return refs;
}

async function main() {
  console.log(`\n=== Auditoría de Storage (${envLabel}) ===`);
  console.log(`DB: ${maskDatabaseUrl(dbUrl)}\n`);

  if (!isSupabaseStorageConfigured()) {
    console.error('Supabase Storage no configurado (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  const dbRefs = await collectDbReferences();
  let totalOrphans = 0;
  let totalBroken = 0;
  let totalObjects = 0;

  for (const bucket of BUCKETS) {
    console.log(`--- Bucket: ${bucket} ---`);
    const objects = await listAllObjects(bucket);
    const referenced = dbRefs.get(bucket) ?? new Set();
    totalObjects += objects.length;

    const objectSet = new Set(objects);
    const orphans = objects.filter((key) => !referenced.has(key));
    const broken = [...referenced].filter((key) => !objectSet.has(key));

    totalOrphans += orphans.length;
    totalBroken += broken.length;

    console.log(`  Objetos en storage: ${objects.length}`);
    console.log(`  Referencias en BD:    ${referenced.size}`);
    console.log(`  Huérfanos storage:    ${orphans.length}`);
    console.log(`  Referencias rotas:    ${broken.length}`);

    if (orphans.length > 0 && orphans.length <= 10) {
      orphans.forEach((k) => console.log(`    huérfano: ${k}`));
    } else if (orphans.length > 10) {
      orphans.slice(0, 5).forEach((k) => console.log(`    huérfano: ${k}`));
      console.log(`    ... y ${orphans.length - 5} más`);
    }

    if (broken.length > 0 && broken.length <= 10) {
      broken.forEach((k) => console.log(`    rota: ${k}`));
    } else if (broken.length > 10) {
      broken.slice(0, 5).forEach((k) => console.log(`    rota: ${k}`));
      console.log(`    ... y ${broken.length - 5} más`);
    }
  }

  const orphanPct =
    totalObjects > 0 ? ((totalOrphans / totalObjects) * 100).toFixed(1) : '0.0';
  console.log('\n--- Resumen ---');
  console.log(`Total objetos: ${totalObjects}`);
  console.log(`Huérfanos:     ${totalOrphans} (${orphanPct}%)`);
  console.log(`Rotas:         ${totalBroken}`);

  const ok = totalBroken === 0 && parseFloat(orphanPct) < 5;
  console.log(ok ? '\nAuditoría de storage: OK' : '\nAuditoría de storage: revisar hallazgos');
  process.exit(ok ? 0 : 1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
