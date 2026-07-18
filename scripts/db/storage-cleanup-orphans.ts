/**
 * Elimina objetos huérfanos en Supabase Storage (sin referencia en DB).
 * Por defecto dry-run. Usar --apply para borrar.
 */
import 'dotenv/config';
import pg from 'pg';
import {
  loadConnectionString,
  loadEnvFilesForLabel,
  listAllStorageObjects,
  resolveEnvLabel,
} from './audit-shared.ts';

const label = resolveEnvLabel(process.argv.slice(2));
const apply = process.argv.includes('--apply');
loadEnvFilesForLabel(label);

const {
  AVATARS_BUCKET,
  EQUIPMENT_PHOTOS_BUCKET,
  PAYMENT_PROOFS_BUCKET,
  VIDEOS_BUCKET,
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
  STORAGE_MEDIA_PREFIX,
  STORAGE_PROOF_PREFIX,
} = await import('../../src/lib/supabaseAdmin.ts');

const databaseUrl = loadConnectionString(label);

function parseProofRef(proofUrl: string): string | null {
  if (!proofUrl.startsWith(STORAGE_PROOF_PREFIX)) return null;
  const key = proofUrl.slice(STORAGE_PROOF_PREFIX.length);
  return key && !key.includes('..') ? key : null;
}

function parseMediaRef(storedUrl: string): { bucket: string; key: string } | null {
  if (!storedUrl.startsWith(STORAGE_MEDIA_PREFIX)) return null;
  const rest = storedUrl.slice(STORAGE_MEDIA_PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  const kind = rest.slice(0, colon);
  const key = rest.slice(colon + 1);
  if (!key || key.includes('..')) return null;
  if (kind === 'avatars') return { bucket: AVATARS_BUCKET, key };
  if (kind === 'videos') return { bucket: VIDEOS_BUCKET, key };
  if (kind === 'equipment') return { bucket: EQUIPMENT_PHOTOS_BUCKET, key };
  return null;
}

async function collectDbRefs(pool: pg.Pool): Promise<Map<string, Set<string>>> {
  const refs = new Map<string, Set<string>>();
  const ensure = (bucket: string) => {
    if (!refs.has(bucket)) refs.set(bucket, new Set());
    return refs.get(bucket)!;
  };

  const proofs = await pool.query<{ proof_url: string }>(
    `SELECT proof_url FROM payments WHERE proof_url LIKE $1`,
    [`${STORAGE_PROOF_PREFIX}%`]
  );
  for (const row of proofs.rows) {
    const k = parseProofRef(row.proof_url);
    if (k) ensure(PAYMENT_PROOFS_BUCKET).add(k);
  }

  const avatars = await pool.query<{ profile_image: string }>(
    `SELECT profile_image FROM users WHERE profile_image LIKE $1`,
    [`${STORAGE_MEDIA_PREFIX}avatars:%`]
  );
  for (const row of avatars.rows) {
    const p = parseMediaRef(row.profile_image);
    if (p) ensure(AVATARS_BUCKET).add(p.key);
  }

  const videos = await pool.query<{ video_url: string | null; video_poster_url: string | null }>(
    `SELECT video_url, video_poster_url FROM exercises
     WHERE video_url LIKE $1 OR video_poster_url LIKE $1`,
    [`${STORAGE_MEDIA_PREFIX}videos:%`]
  );
  for (const row of videos.rows) {
    for (const ref of [row.video_url, row.video_poster_url]) {
      if (!ref) continue;
      const p = parseMediaRef(ref);
      if (p) ensure(VIDEOS_BUCKET).add(p.key);
    }
  }

  const equipment = await pool.query<{ photo_url: string }>(
    `SELECT photo_url FROM gym_equipment WHERE photo_url LIKE $1`,
    [`${STORAGE_MEDIA_PREFIX}equipment:%`]
  );
  for (const row of equipment.rows) {
    const p = parseMediaRef(row.photo_url);
    if (p) ensure(EQUIPMENT_PHOTOS_BUCKET).add(p.key);
  }

  return refs;
}

const { getScriptPgSslConfig } = await import('../lib/pgSsl.ts');

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 2,
  ssl: getScriptPgSslConfig(databaseUrl),
});

try {
  if (!isSupabaseStorageConfigured()) {
    console.error('Supabase Storage no configurado');
    process.exit(1);
  }

  console.log(`Entorno: ${label}`);
  console.log(`Modo: ${apply ? 'APLICAR (borrar)' : 'DRY-RUN (solo listar)'}`);

  const admin = getSupabaseAdmin();
  const dbRefs = await collectDbRefs(pool);
  const buckets = [PAYMENT_PROOFS_BUCKET, AVATARS_BUCKET, VIDEOS_BUCKET, EQUIPMENT_PHOTOS_BUCKET];
  let totalOrphans = 0;
  let totalDeleted = 0;

  for (const bucket of buckets) {
    const storageKeys = await listAllStorageObjects((prefix, opts) =>
      admin.storage.from(bucket).list(prefix, opts)
    );
    const referenced = dbRefs.get(bucket) ?? new Set();
    const orphans = storageKeys.filter((k) => !referenced.has(k));
    totalOrphans += orphans.length;

    console.log(`\n${bucket}: ${orphans.length} huérfanos de ${storageKeys.length} objetos`);
    for (const key of orphans.slice(0, 20)) {
      console.log(`  - ${key}`);
    }
    if (orphans.length > 20) console.log(`  … y ${orphans.length - 20} más`);

    if (apply && orphans.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < orphans.length; i += batchSize) {
        const batch = orphans.slice(i, i + batchSize);
        const { error } = await admin.storage.from(bucket).remove(batch);
        if (error) throw error;
        totalDeleted += batch.length;
      }
    }
  }

  console.log(`\nTotal huérfanos: ${totalOrphans}`);
  if (apply) console.log(`Eliminados: ${totalDeleted}`);
  else if (totalOrphans > 0) console.log('Ejecuta con --apply para eliminar.');
} finally {
  await pool.end();
}
