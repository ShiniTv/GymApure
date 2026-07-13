/**
 * Importa ejercicios predeterminados del sistema desde un CSV + carpeta de videos.
 *
 * Requisitos:
 *   - FFmpeg/ffprobe en PATH (o FFMPEG_PATH en .env)
 *   - DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   npx tsx scripts/db/seed-system-exercises.ts --csv scripts/db/data/system-exercises.csv --videos "C:\ruta\videos"
 *   npx tsx scripts/db/seed-system-exercises.ts --dry-run
 *   npx tsx scripts/db/seed-system-exercises.ts --skip-existing
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'node:fs';
import { query } from '../../src/db/index.ts';
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
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--skip-existing') args.skipExisting = true;
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

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV no encontrado: ${csvPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(videosDir)) {
    console.error(`Carpeta de videos no encontrada: ${videosDir}`);
    process.exit(1);
  }

  if (!dryRun && !isSupabaseStorageConfigured()) {
    console.error('Supabase Storage no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const ffmpegOk = await isFfmpegAvailable();
  if (!ffmpegOk) {
    console.error('FFmpeg no disponible. Instálalo o define FFMPEG_PATH en .env');
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  if (rows.length === 0) {
    console.error('El CSV no tiene filas de datos.');
    process.exit(1);
  }

  const allowedGroups = new Set<string>(MUSCLE_GROUPS);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Procesando ${rows.length} ejercicios${dryRun ? ' (dry-run)' : ''}…`);
  console.log(`Videos: ${videosDir}`);
  console.log(`CSV: ${csvPath}\n`);

  for (const row of rows) {
    const label = `${row.name} (${row.filename})`;

    if (!allowedGroups.has(row.muscle_group)) {
      console.error(`  FAIL ${label} — grupo muscular inválido: ${row.muscle_group}`);
      failed++;
      continue;
    }

    const videoPath = path.join(videosDir, row.filename);
    if (!fs.existsSync(videoPath)) {
      console.error(`  FAIL ${label} — archivo no encontrado`);
      failed++;
      continue;
    }

    if (skipExisting && (await exerciseExistsByName(row.name))) {
      console.log(`  SKIP ${label} — ya existe`);
      skipped++;
      continue;
    }

    if (dryRun) {
      const sizeMb = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(1);
      console.log(`  OK   ${label} — ${sizeMb} MB (sin subir)`);
      ok++;
      continue;
    }

    try {
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
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
