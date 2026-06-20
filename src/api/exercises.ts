import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';
import { videoUpload } from '../lib/uploadStorage.ts';
import {
  uploadMediaFile,
  localVideoPathFromUpload,
  isMediaStorageRemote,
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

async function resolveVideoPath(
  file: Express.Multer.File | undefined,
  video_url: string | null | undefined
): Promise<string | null | undefined> {
  if (!file) return video_url;
  assertVideoUpload(file);
  if (isMediaStorageRemote()) {
    return uploadMediaFile('videos', file, 'exercises');
  }
  return localVideoPathFromUpload(file);
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
  let videoPath: string | null | undefined;
  try {
    videoPath = await resolveVideoPath(req.file, video_url);
  } catch (err: unknown) {
    return res.status(400).json({ error: getErrorMessage(err) });
  }

  try {
    const { rows } = await query<{ id: number }>(
      `INSERT INTO exercises (name, muscle_group, description, execution, video_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, muscle_group, description, execution, videoPath]
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
  let videoPath: string | null | undefined;
  try {
    videoPath = await resolveVideoPath(req.file, video_url);
  } catch (err: unknown) {
    return res.status(400).json({ error: getErrorMessage(err) });
  }

  try {
    await query(
      `UPDATE exercises
       SET name = $1, muscle_group = $2, description = $3, execution = $4, video_url = $5
       WHERE id = $6`,
      [name, muscle_group, description, execution, videoPath, id]
    );
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

    await query('DELETE FROM exercises WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;
