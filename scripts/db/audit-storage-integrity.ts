/**
 * Compara referencias en DB vs objetos en Supabase Storage.
 */
import 'dotenv/config';
import pg from 'pg';
import {
  loadConnectionString,
  loadEnvFilesForLabel,
  listAllStorageObjects,
  maskDatabaseUrl,
  printChecks,
  resolveEnvLabel,
  type AuditCheck,
} from './audit-shared.ts';

const label = resolveEnvLabel(process.argv.slice(2));
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
    const key = parseProofRef(row.proof_url);
    if (key) ensure(PAYMENT_PROOFS_BUCKET).add(key);
  }

  const avatars = await pool.query<{ profile_image: string }>(
    `SELECT profile_image FROM users WHERE profile_image LIKE $1`,
    [`${STORAGE_MEDIA_PREFIX}avatars:%`]
  );
  for (const row of avatars.rows) {
    const parsed = parseMediaRef(row.profile_image);
    if (parsed) ensure(AVATARS_BUCKET).add(parsed.key);
  }

  const videos = await pool.query<{ video_url: string | null; video_poster_url: string | null }>(
    `SELECT video_url, video_poster_url FROM exercises
     WHERE video_url LIKE $1 OR video_poster_url LIKE $1`,
    [`${STORAGE_MEDIA_PREFIX}videos:%`]
  );
  for (const row of videos.rows) {
    for (const ref of [row.video_url, row.video_poster_url]) {
      if (!ref) continue;
      const parsed = parseMediaRef(ref);
      if (parsed) ensure(VIDEOS_BUCKET).add(parsed.key);
    }
  }

  const equipment = await pool.query<{ photo_url: string }>(
    `SELECT photo_url FROM gym_equipment WHERE photo_url LIKE $1`,
    [`${STORAGE_MEDIA_PREFIX}equipment:%`]
  );
  for (const row of equipment.rows) {
    const parsed = parseMediaRef(row.photo_url);
    if (parsed) ensure(EQUIPMENT_PHOTOS_BUCKET).add(parsed.key);
  }

  return refs;
}

type BucketAudit = {
  bucket: string;
  storageObjects: number;
  dbRefs: number;
  orphans: number;
  brokenRefs: number;
  orphanSample: string[];
  brokenSample: string[];
};

const { getScriptPgSslConfig } = await import('../lib/pgSsl.ts');

const checks: AuditCheck[] = [];
const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 2,
  ssl: getScriptPgSslConfig(databaseUrl),
});

try {
  console.log(`Entorno: ${label}`);
  console.log(`DB: ${maskDatabaseUrl(databaseUrl)}`);

  if (!isSupabaseStorageConfigured()) {
    checks.push({
      name: 'Supabase Storage configurado',
      ok: false,
      detail: 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY ausente',
    });
    printChecks(`Auditoría storage (${label})`, checks);
    process.exit(1);
  }

  checks.push({ name: 'Supabase Storage configurado', ok: true, detail: 'ok' });

  const admin = getSupabaseAdmin();
  const dbRefs = await collectDbRefs(pool);
  const buckets = [PAYMENT_PROOFS_BUCKET, AVATARS_BUCKET, VIDEOS_BUCKET, EQUIPMENT_PHOTOS_BUCKET];
  const results: BucketAudit[] = [];

  for (const bucket of buckets) {
    const storageKeys = new Set(
      await listAllStorageObjects((prefix, opts) =>
        admin.storage.from(bucket).list(prefix, opts)
      )
    );
    const referenced = dbRefs.get(bucket) ?? new Set();
    const orphans = [...storageKeys].filter((k) => !referenced.has(k));
    const broken = [...referenced].filter((k) => !storageKeys.has(k));

    const audit: BucketAudit = {
      bucket,
      storageObjects: storageKeys.size,
      dbRefs: referenced.size,
      orphans: orphans.length,
      brokenRefs: broken.length,
      orphanSample: orphans.slice(0, 5),
      brokenSample: broken.slice(0, 5),
    };
    results.push(audit);

    const orphanPct =
      audit.storageObjects > 0 ? ((audit.orphans / audit.storageObjects) * 100).toFixed(1) : '0.0';

    checks.push({
      name: `Bucket ${bucket}`,
      ok: audit.brokenRefs === 0 && parseFloat(orphanPct) < 5,
      detail: `storage=${audit.storageObjects} db=${audit.dbRefs} huérfanos=${audit.orphans} (${orphanPct}%) rotas=${audit.brokenRefs}`,
    });

    console.log(`\n--- ${bucket} ---`);
    console.log(`  Objetos storage: ${audit.storageObjects}`);
    console.log(`  Referencias DB:  ${audit.dbRefs}`);
    console.log(`  Huérfanos:       ${audit.orphans}`);
    console.log(`  Referencias rotas: ${audit.brokenRefs}`);
    if (audit.orphanSample.length) console.log(`  Muestra huérfanos: ${audit.orphanSample.join(', ')}`);
    if (audit.brokenSample.length) console.log(`  Muestra rotas: ${audit.brokenSample.join(', ')}`);
  }

  const totalOrphans = results.reduce((sum, r) => sum + r.orphans, 0);
  const totalStorage = results.reduce((sum, r) => sum + r.storageObjects, 0);
  const totalBroken = results.reduce((sum, r) => sum + r.brokenRefs, 0);
  checks.push({
    name: 'Resumen storage',
    ok: totalBroken === 0 && (totalStorage === 0 || totalOrphans / totalStorage < 0.05),
    detail: `huérfanos=${totalOrphans}/${totalStorage} rotas=${totalBroken}`,
  });
} finally {
  await pool.end();
}

const failed = printChecks(`Auditoría storage (${label})`, checks);
process.exit(failed === 0 ? 0 : 1);
