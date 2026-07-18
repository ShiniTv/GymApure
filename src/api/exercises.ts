import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { query } from '../db/index.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
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
import {
  assertValidExerciseVideoRef,
  createExerciseVideoUploadSession,
  getExerciseMediaCapabilities,
} from '../lib/exerciseVideoStorage.ts';
import {
  buildExerciseListQueries,
  canTrainerMutateExercise,
  forkSystemExerciseForTrainer,
  getExerciseById,
  hideSystemExerciseForTrainer,
  isSystemCatalogExercise,
} from '../lib/exerciseLibrary.ts';
import { parseBooleanQuery, parsePaginationQuery, parseSearchQuery } from '../lib/pagination.ts';

const router = asyncRouter();

const exercisePayloadSchema = z.object({
  name: z.string().trim().min(2, 'Nombre inválido'),
  muscle_group: z.string().trim().min(2, 'Grupo muscular inválido'),
  description: z.string().trim().max(2000).optional().nullable(),
  execution: z.string().trim().max(5000).optional().nullable(),
  video_url: z.string().trim().max(1000).optional().nullable(),
  video_storage_ref: z.string().trim().max(500).optional().nullable(),
});

const uploadUrlSchema = z.object({
  contentType: z.enum(['video/mp4', 'video/webm']),
  fileSize: z.number().int().positive(),
});

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

function isExternalVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be') || url.startsWith('http');
}

interface ResolvedExerciseVideo {
  videoUrl: string | null | undefined;
  posterUrl: string | null | undefined;
}

async function resolveExerciseVideo(
  file: Express.Multer.File | undefined,
  video_url: string | null | undefined,
  video_storage_ref: string | null | undefined,
  existingPoster?: string | null
): Promise<ResolvedExerciseVideo> {
  if (file && isMediaStorageRemote()) {
    throw new Error(
      'En producción el video debe subirse con upload directo. Selecciona el archivo de nuevo y guarda.'
    );
  }

  if (video_storage_ref?.trim()) {
    assertValidExerciseVideoRef(video_storage_ref.trim());
    return { videoUrl: video_storage_ref.trim(), posterUrl: null };
  }

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

  if (video_url?.startsWith('sbmedia:videos:')) {
    assertValidExerciseVideoRef(video_url);
    return { videoUrl: video_url, posterUrl: existingPoster ?? null };
  }

  return { videoUrl: video_url, posterUrl: existingPoster ?? null };
}

router.get('/media-capabilities', authorize(['trainer']), async (_req, res) => {
  try {
    const capabilities = await getExerciseMediaCapabilities();
    res.json(capabilities);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post('/upload-url', authorize(['trainer']), uploadRateLimiter, async (req, res) => {
  const parsed = uploadUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const session = await createExerciseVideoUploadSession(
      parsed.data.contentType,
      parsed.data.fileSize
    );
    res.json(session);
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err) });
  }
});

const EXERCISES_ALL_MAX = 500;

router.get('/', async (req: AuthRequest, res) => {
  try {
    const muscleGroup =
      typeof req.query.muscle_group === 'string' ? req.query.muscle_group.trim() : '';
    const search = parseSearchQuery(req.query);
    const role = req.user?.role ?? 'member';
    const trainerId = role === 'trainer' ? req.user!.id : null;
    const wantAll = parseBooleanQuery(req.query.all);

    if (wantAll) {
      const { listSql, listParams } = buildExerciseListQueries({
        role,
        trainerId,
        muscleGroup: muscleGroup || undefined,
        search: search || undefined,
        limit: EXERCISES_ALL_MAX,
        offset: 0,
      });
      const { rows } = await query(listSql, listParams);
      res.json(rows);
      return;
    }

    const { page, pageSize, offset } = parsePaginationQuery(req.query, {
      pageSize: 50,
      maxPageSize: 100,
    });
    const { countSql, listSql, params, listParams } = buildExerciseListQueries({
      role,
      trainerId,
      muscleGroup: muscleGroup || undefined,
      search: search || undefined,
      limit: pageSize,
      offset,
    });
    const [countResult, listResult] = await Promise.all([
      query<{ count: string }>(countSql, params),
      query(listSql, listParams),
    ]);
    res.json({
      items: listResult.rows,
      total: parseInt(countResult.rows[0]?.count || '0', 10),
      page,
      pageSize,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post(
  '/',
  authorize(['trainer']),
  uploadRateLimiter,
  videoUpload.single('video'),
  async (req: AuthRequest, res) => {
    const parsed = exercisePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const { name, muscle_group, description, execution, video_url, video_storage_ref } =
      parsed.data;
    let resolved: ResolvedExerciseVideo;
    try {
      resolved = await resolveExerciseVideo(req.file, video_url, video_storage_ref, null);
    } catch (err: unknown) {
      return res.status(400).json({ error: getErrorMessage(err) });
    }

    try {
      const { rows } = await query<{ id: number }>(
        `INSERT INTO exercises (
           name, muscle_group, description, execution, video_url, video_poster_url,
           is_system, owner_trainer_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, false, $7)
         RETURNING id`,
        [
          name,
          muscle_group,
          description,
          execution,
          resolved.videoUrl,
          resolved.posterUrl,
          req.user!.id,
        ]
      );
      res.status(201).json({ id: rows[0].id });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  }
);

router.put(
  '/:id',
  authorize(['trainer']),
  uploadRateLimiter,
  videoUpload.single('video'),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const parsed = exercisePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const { name, muscle_group, description, execution, video_url, video_storage_ref } =
      parsed.data;

    const existing = await getExerciseById(Number(id));
    if (!existing) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    const trainerId = req.user!.id;
    if (!canTrainerMutateExercise(existing, trainerId)) {
      return res.status(403).json({ error: 'No puedes editar este ejercicio' });
    }

    let resolved: ResolvedExerciseVideo;
    try {
      resolved = await resolveExerciseVideo(
        req.file,
        video_url,
        video_storage_ref,
        existing.video_poster_url
      );
    } catch (err: unknown) {
      return res.status(400).json({ error: getErrorMessage(err) });
    }

    const mediaChanged =
      Boolean(req.file) ||
      Boolean(video_storage_ref?.trim()) ||
      resolved.videoUrl !== existing.video_url ||
      resolved.posterUrl !== existing.video_poster_url;

    try {
      if (isSystemCatalogExercise(existing)) {
        const forkId = await forkSystemExerciseForTrainer(existing, trainerId, {
          name,
          muscle_group,
          description,
          execution,
          video_url: resolved.videoUrl,
          video_poster_url: resolved.posterUrl,
        });

        res.json({ success: true, id: forkId, forked: true });
        return;
      }

      await query(
        `UPDATE exercises
         SET name = $1, muscle_group = $2, description = $3, execution = $4,
             video_url = $5, video_poster_url = $6
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
  }
);

router.delete('/:id', authorize(['trainer']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const trainerId = req.user!.id;

  try {
    const exercise = await getExerciseById(Number(id));
    if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    if (!canTrainerMutateExercise(exercise, trainerId)) {
      return res.status(403).json({ error: 'No puedes eliminar este ejercicio' });
    }

    if (isSystemCatalogExercise(exercise)) {
      await hideSystemExerciseForTrainer(trainerId, exercise.id);
      res.json({ success: true, hidden: true });
      return;
    }

    const { rows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM routine_exercises WHERE exercise_id = $1',
      [id]
    );

    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'Este ejercicio está en una o más rutinas y no se puede eliminar.',
      });
    }

    await query('DELETE FROM exercises WHERE id = $1', [id]);
    await deleteExerciseMedia(exercise.video_url, exercise.video_poster_url);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;
