import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';
import { videoUpload } from '../lib/uploadStorage.ts';
import {
  uploadExerciseVideo,
  localExerciseVideoFromUpload,
  isMediaStorageRemote,
  deleteExerciseMedia,
  type ExerciseVideoUploadResult,
} from '../lib/mediaStorage.ts';
import { assertVideoUpload } from '../lib/uploadValidation.ts';

const router = asyncRouter();

const exercisePayloadSchema = z.object({
  name: z.string().trim().min(2, 'Nombre inválido'),
  muscle_group: z.string().trim().min(2, 'Grupo muscular inválido'),
  description: z.string().trim().max(2000).optional().nullable(),
  execution: z.string().trim().max(5000).optional().nullable(),
  video_url: z.string().trim().max(1000).optional().nullable(),
});

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

function isExternalVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be') || url.startsWith('http');
}

type ResolvedExerciseVideo = {
  videoUrl: string | null | undefined;
  posterUrl: string | null | undefined;
};

async function resolveExerciseVideo(
  file: Express.Multer.File | undefined,
  video_url: string | null | undefined,
  existingPoster?: string | null
): Promise<ResolvedExerciseVideo> {
  if (file) {
    assertVideoUpload(file);
    const uploaded: ExerciseVideoUploadResult = isMediaStorageRemote()
      ? await uploadExerciseVideo(file)
      : await localExerciseVideoFromUpload(file);
    return { videoUrl: uploaded.videoUrl, posterUrl: uploaded.posterUrl };
  }

  if (isExternalVideoUrl(video_url)) {
    return { videoUrl: video_url, posterUrl: null };
  }

  return { videoUrl: video_url, posterUrl: existingPoster ?? null };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM exercises ORDER BY name');
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/', authorize(['admin', 'trainer']), uploadRateLimiter, videoUpload.single('video'), async (req, res) => {
  const parsed = exercisePayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }
  const { name, muscle_group, description, execution, video_url } = parsed.data;
  let resolved: ResolvedExerciseVideo;
  try {
    resolved = await resolveExerciseVideo(req.file, video_url);
  } catch (err: unknown) {
    return res.status(400).json({ error: getErrorMessage(err) });
  }

  try {
    const { rows } = await query<{ id: number }>(
      `INSERT INTO exercises (name, muscle_group, description, execution, video_url, video_poster_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, muscle_group, description, execution, resolved.videoUrl, resolved.posterUrl]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.put('/:id', authorize(['admin', 'trainer']), uploadRateLimiter, videoUpload.single('video'), async (req, res) => {
  const { id } = req.params;
  const parsed = exercisePayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }
  const { name, muscle_group, description, execution, video_url } = parsed.data;

  let existing: { video_url: string | null; video_poster_url: string | null } | undefined;
  try {
    const { rows } = await query<{ video_url: string | null; video_poster_url: string | null }>(
      'SELECT video_url, video_poster_url FROM exercises WHERE id = $1',
      [id]
    );
    existing = rows[0];
    if (!existing) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  } catch (err: unknown) {
    return res.status(500).json({ error: getErrorMessage(err) });
  }

  let resolved: ResolvedExerciseVideo;
  try {
    resolved = await resolveExerciseVideo(req.file, video_url, existing.video_poster_url);
  } catch (err: unknown) {
    return res.status(400).json({ error: getErrorMessage(err) });
  }

  const mediaChanged =
    Boolean(req.file) ||
    resolved.videoUrl !== existing.video_url ||
    resolved.posterUrl !== existing.video_poster_url;

  try {
    await query(
      `UPDATE exercises
       SET name = $1, muscle_group = $2, description = $3, execution = $4, video_url = $5, video_poster_url = $6
       WHERE id = $7`,
      [name, muscle_group, description, execution, resolved.videoUrl, resolved.posterUrl, id]
    );

    if (mediaChanged) {
      await deleteExerciseMedia(existing.video_url, existing.video_poster_url);
    }

    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.delete('/:id', authorize(['admin', 'trainer']), async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM routine_exercises WHERE exercise_id = $1',
      [id]
    );

    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'This exercise is used in one or more routines and cannot be deleted.',
      });
    }

    const { rows: exerciseRows } = await query<{
      video_url: string | null;
      video_poster_url: string | null;
    }>('SELECT video_url, video_poster_url FROM exercises WHERE id = $1', [id]);

    await query('DELETE FROM exercises WHERE id = $1', [id]);
    await deleteExerciseMedia(exerciseRows[0]?.video_url, exerciseRows[0]?.video_poster_url);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;
