/**
 * Importa ejercicios predeterminados del sistema desde un CSV (+ carpeta de videos opcional).
 *
 * Requisitos:
 *   - DATABASE_URL
 *   - Con video: FFmpeg/ffprobe (o FFMPEG_PATH), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Sin video: --allow-missing-video (no exige carpeta de videos ni FFmpeg)
 *
 * Uso:
 *   npx tsx scripts/db/seed-system-exercises.ts --csv scripts/db/data/system-exercises.csv --videos "C:\ruta\videos"
 *   npx tsx scripts/db/seed-system-exercises.ts --dry-run
 *   npx tsx scripts/db/seed-system-exercises.ts --skip-existing
 *   npx tsx scripts/db/seed-system-exercises.ts --skip-existing --allow-missing-video
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'node:fs';
import { query, pool } from '../../src/db/index.ts';
import { assertNotProductionDatabase } from '../lib/db-env-guard.ts';
import { MUSCLE_GROUPS } from '../../src/lib/exerciseMuscleGroups.ts';
import { optimizeExerciseVideo, isFfmpegAvailable, VideoValidationError } from '../../src/lib/videoOptimizer.ts';
import {
  VIDEOS_BUCKET,
  STORAGE_MEDIA_PREFIX,
  supabaseStorageUpload,
  isSupabaseStorageConfigured,
} from '../../src/lib/supabaseAdmin.ts';

interface CsvRow {
  filename: string;
  name: string;
  muscle_group: string;
  description: string;
  execution: string;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {
    dryRun: false,
    skipExisting: false,
    allowMissingVideo: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--skip-existing') args.skipExisting = true;
    else if (arg === '--allow-missing-video') args.allowMissingVideo = true;
    else if (arg === '--csv' && argv[i + 1]) args.csv = argv[++i];
    else if (arg === '--videos' && argv[i + 1]) args.videos = argv[++i];
  }
  return args;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#'));
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);

  const filenameIdx = idx('filename');
  const nameIdx = idx('name');
  const muscleIdx = idx('muscle_group');
  const descIdx = idx('description');
  const execIdx = idx('execution');

  if (filenameIdx < 0 || nameIdx < 0 || muscleIdx < 0) {
    throw new Error('CSV debe incluir columnas: filename, name, muscle_group');
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    return {
      filename: cols[filenameIdx] ?? '',
      name: cols[nameIdx] ?? '',
      muscle_group: cols[muscleIdx] ?? '',
      description: descIdx >= 0 ? (cols[descIdx] ?? '') : '',
      execution: execIdx >= 0 ? (cols[execIdx] ?? '').replace(/\|/g, '\n') : '',
    };
  });
}

function buildMediaRef(objectKey: string): string {
  return `${STORAGE_MEDIA_PREFIX}videos:${objectKey}`;
}

async function uploadExerciseMedia(
  videoBuffer: Buffer,
  posterBuffer: Buffer
): Promise<{ videoUrl: string; posterUrl: string }> {
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const videoKey = `exercises/${baseName}.mp4`;
  const posterKey = `exercises/${baseName}-poster.webp`;

  await supabaseStorageUpload(VIDEOS_BUCKET, videoKey, videoBuffer, 'video/mp4');
  await supabaseStorageUpload(VIDEOS_BUCKET, posterKey, posterBuffer, 'image/webp');

  return {
    videoUrl: buildMediaRef(videoKey),
    posterUrl: buildMediaRef(posterKey),
  };
}

async function exerciseExistsByName(name: string): Promise<boolean> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM exercises WHERE LOWER(name) = LOWER($1) AND is_system = true LIMIT 1`,
    [name]
  );
  return rows.length > 0;
}

async function insertExerciseWithoutVideo(row: CsvRow): Promise<void> {
  await query(
    `INSERT INTO exercises (
       name, muscle_group, description, execution, video_url, video_poster_url,
       is_system, owner_trainer_id, forked_from_id
     )
     VALUES ($1, $2, $3, $4, NULL, NULL, true, NULL, NULL)`,
    [row.name, row.muscle_group, row.description || null, row.execution || null]
  );
}

async function main() {
  assertNotProductionDatabase({ scriptName: 'db:seed-system-exercises' });

  const args = parseArgs(process.argv);
  const csvPath =
    (args.csv as string) ?? path.join(process.cwd(), 'scripts/db/data/system-exercises.csv');
  const videosDir =
    (args.videos as string) ??
    path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', 'Desktop', 'Multimedia_Caribean-Gym');
  const dryRun = Boolean(args.dryRun);
  const skipExisting = Boolean(args.skipExisting);
  const allowMissingVideo = Boolean(args.allowMissingVideo);

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV no encontrado: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  if (rows.length === 0) {
    console.error('El CSV no tiene filas de datos.');
    process.exit(1);
  }

  const videosDirExists = fs.existsSync(videosDir);
  const needsVideoPath = (row: CsvRow) => Boolean(row.filename.trim());
  const rowsWithVideoFile = rows.filter(
    (row) => needsVideoPath(row) && videosDirExists && fs.existsSync(path.join(videosDir, row.filename))
  );
  const willUploadAnyVideo = rowsWithVideoFile.length > 0 && !dryRun;

  if (!allowMissingVideo && !videosDirExists) {
    console.error(`Carpeta de videos no encontrada: ${videosDir}`);
    console.error('Usa --allow-missing-video para sembrar sin multimedia.');
    process.exit(1);
  }

  if (willUploadAnyVideo) {
    if (!isSupabaseStorageConfigured()) {
      console.error('Supabase Storage no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
      process.exit(1);
    }
    const ffmpegOk = await isFfmpegAvailable();
    if (!ffmpegOk) {
      console.error('FFmpeg no disponible. Instálalo o define FFMPEG_PATH en .env');
      process.exit(1);
    }
  } else if (!dryRun && !allowMissingVideo) {
    // All rows expected to have videos but none found on disk — fail early.
    const missingAny = rows.some((row) => !row.filename.trim() || !videosDirExists);
    if (missingAny) {
      console.error('Hay filas sin video. Usa --allow-missing-video o provee los .mp4.');
      process.exit(1);
    }
  }

  const allowedGroups = new Set<string>(MUSCLE_GROUPS);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Procesando ${rows.length} ejercicios${dryRun ? ' (dry-run)' : ''}…`);
  console.log(`Videos: ${videosDirExists ? videosDir : '(no requerida / no encontrada)'}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`skip-existing: ${skipExisting}`);
  console.log(`allow-missing-video: ${allowMissingVideo}\n`);

  for (const row of rows) {
    const label = row.filename ? `${row.name} (${row.filename})` : `${row.name} (sin video)`;

    if (!row.name.trim() || row.name === 'name') {
      if (row.name === 'name' && row.muscle_group === 'muscle_group') {
        continue; // cabecera CSV duplicada
      }
      console.error(`  FAIL fila sin nombre`);
      failed++;
      continue;
    }

    if (!allowedGroups.has(row.muscle_group)) {
      console.error(`  FAIL ${label} — grupo muscular inválido: ${row.muscle_group}`);
      failed++;
      continue;
    }

    if (skipExisting && (await exerciseExistsByName(row.name))) {
      console.log(`  SKIP ${label} — ya existe`);
      skipped++;
      continue;
    }

    const videoPath = row.filename.trim() ? path.join(videosDir, row.filename) : '';
    const hasVideoFile = Boolean(videoPath && fs.existsSync(videoPath));

    if (!hasVideoFile && !allowMissingVideo) {
      console.error(`  FAIL ${label} — archivo no encontrado`);
      failed++;
      continue;
    }

    if (dryRun) {
      if (hasVideoFile) {
        const sizeMb = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(1);
        console.log(`  OK   ${label} — ${sizeMb} MB (sin subir)`);
      } else {
        console.log(`  OK   ${label} — sin video (INSERT NULL)`);
      }
      ok++;
      continue;
    }

    try {
      if (!hasVideoFile) {
        await insertExerciseWithoutVideo(row);
        console.log(`  OK   ${label} — insertado sin video`);
        ok++;
        continue;
      }

      const input = fs.readFileSync(videoPath);
      const optimized = await optimizeExerciseVideo(input, 'video/mp4');
      const { videoUrl, posterUrl } = await uploadExerciseMedia(
        optimized.buffer,
        optimized.poster
      );

      await query(
        `INSERT INTO exercises (
           name, muscle_group, description, execution, video_url, video_poster_url,
           is_system, owner_trainer_id, forked_from_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, true, NULL, NULL)`,
        [
          row.name,
          row.muscle_group,
          row.description || null,
          row.execution || null,
          videoUrl,
          posterUrl,
        ]
      );

      const sizeMb = (optimized.buffer.length / (1024 * 1024)).toFixed(1);
      console.log(`  OK   ${label} — comprimido a ${sizeMb} MB`);
      ok++;
    } catch (err) {
      const msg = err instanceof VideoValidationError ? err.message : err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${label} — ${msg}`);
      failed++;
    }
  }

  console.log(`\nResumen: ${ok} ok, ${skipped} omitidos, ${failed} fallidos`);
  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(async (err: unknown) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
