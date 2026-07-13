import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  isSupabaseStorageConfigured,
  AVATARS_BUCKET,
  VIDEOS_BUCKET,
  EQUIPMENT_PHOTOS_BUCKET,
  STORAGE_MEDIA_PREFIX,
  supabaseStorageRemove,
  supabaseStorageUpload,
  supabaseStorageStream,
} from './supabaseAdmin.ts';
import { avatarApiPath, videoApiPath, resolveFilePath } from './uploadStorage.ts';
import { VIDEO_MAX_OUTPUT_BYTES } from './videoConfig.ts';
import { VideoValidationError } from './videoOptimizer.ts';
import { logger } from './logger.ts';

export type MediaKind = 'avatars' | 'videos' | 'equipment';

export interface ExerciseVideoUploadResult {
  videoUrl: string;
  posterUrl: string | null;
}

function buildStorageMediaRef(kind: MediaKind, objectKey: string): string {
  return `${STORAGE_MEDIA_PREFIX}${kind}:${objectKey}`;
}

export function parseStorageMediaRef(
  storedUrl: string
): { kind: MediaKind; objectKey: string } | null {
  if (!storedUrl.startsWith(STORAGE_MEDIA_PREFIX)) return null;
  const rest = storedUrl.slice(STORAGE_MEDIA_PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  const kind = rest.slice(0, colon) as MediaKind;
  const objectKey = rest.slice(colon + 1);
  if (
    (kind !== 'avatars' && kind !== 'videos' && kind !== 'equipment') ||
    !objectKey ||
    objectKey.includes('..')
  ) {
    return null;
  }
  return { kind, objectKey };
}

function bucketForKind(kind: MediaKind): string {
  if (kind === 'avatars') return AVATARS_BUCKET;
  if (kind === 'equipment') return EQUIPMENT_PHOTOS_BUCKET;
  return VIDEOS_BUCKET;
}

function extensionFromMime(mime: string, kind: MediaKind): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'video/mp4':
      return '.mp4';
    case 'video/webm':
      return '.webm';
    default:
      return kind === 'avatars' ? '.jpg' : '.mp4';
  }
}

export async function uploadMediaFile(
  kind: MediaKind,
  file: Express.Multer.File,
  objectPrefix: string
): Promise<string> {
  let body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) {
    throw new Error('No se pudo leer el archivo subido');
  }

  if (
    (kind === 'avatars' || kind === 'equipment') &&
    (file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp')
  ) {
    try {
      const { optimizeAvatar } = await import('./imageOptimizer.ts');
      const result = await optimizeAvatar(body);
      body = result.buffer;
      file.mimetype = result.mime;
    } catch {
      /* fallback to original */
    }
  }

  const ext =
    kind === 'avatars' || kind === 'equipment'
      ? '.webp'
      : path.extname(file.originalname) || extensionFromMime(file.mimetype, kind);
  const objectKey = `${objectPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  await supabaseStorageUpload(bucketForKind(kind), objectKey, body, file.mimetype);

  if (file.path) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }

  return buildStorageMediaRef(kind, objectKey);
}

async function transcodeExerciseVideo(
  body: Buffer,
  mime: string
): Promise<{ videoBuffer: Buffer; videoMime: string; posterBuffer: Buffer | null }> {
  try {
    const { optimizeExerciseVideo } = await import('./videoOptimizer.ts');
    const optimized = await optimizeExerciseVideo(body, mime);
    return {
      videoBuffer: optimized.buffer,
      videoMime: optimized.mime,
      posterBuffer: optimized.poster,
    };
  } catch (err) {
    if (err instanceof VideoValidationError) throw err;
    logger.warn('FFmpeg no disponible o falló la transcodificación; se sube el original', {
      error: err instanceof Error ? err.message : String(err),
    });
    if (body.length > VIDEO_MAX_OUTPUT_BYTES) {
      throw new VideoValidationError(
        'El video es demasiado grande y FFmpeg no está disponible para comprimirlo. ' +
          'Instala FFmpeg en el servidor o reduce el archivo antes de subirlo.'
      );
    }
    const videoMime =
      mime === 'video/webm' ? 'video/webm' : mime === 'video/quicktime' ? 'video/mp4' : mime;
    return { videoBuffer: body, videoMime, posterBuffer: null };
  }
}

export async function uploadExerciseVideo(
  file: Express.Multer.File
): Promise<ExerciseVideoUploadResult> {
  const body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) {
    throw new Error('No se pudo leer el archivo subido');
  }

  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { videoBuffer, videoMime, posterBuffer } = await transcodeExerciseVideo(
    body,
    file.mimetype
  );

  const videoKey = `exercises/${baseName}.mp4`;
  await supabaseStorageUpload(bucketForKind('videos'), videoKey, videoBuffer, videoMime);

  let posterUrl: string | null = null;
  if (posterBuffer) {
    const posterKey = `exercises/${baseName}-poster.webp`;
    try {
      await supabaseStorageUpload(bucketForKind('videos'), posterKey, posterBuffer, 'image/webp');
      posterUrl = buildStorageMediaRef('videos', posterKey);
    } catch (err) {
      logger.warn('No se pudo subir el poster del video; el video se guardó sin thumbnail', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (file.path) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }

  return {
    videoUrl: buildStorageMediaRef('videos', videoKey),
    posterUrl,
  };
}

export async function localExerciseVideoFromUpload(
  file: Express.Multer.File
): Promise<ExerciseVideoUploadResult> {
  const body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) {
    throw new Error('No se pudo leer el archivo subido');
  }

  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { videoBuffer, videoMime, posterBuffer } = await transcodeExerciseVideo(
    body,
    file.mimetype
  );

  const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const videoFilename = `${baseName}.mp4`;
  fs.writeFileSync(path.join(uploadsDir, videoFilename), videoBuffer);

  let posterUrl: string | null = null;
  if (posterBuffer) {
    const posterFilename = `${baseName}-poster.webp`;
    fs.writeFileSync(path.join(uploadsDir, posterFilename), posterBuffer);
    posterUrl = videoApiPath(posterFilename);
  }

  if (file.path && file.path !== path.join(uploadsDir, videoFilename)) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }

  void videoMime;
  return {
    videoUrl: videoApiPath(videoFilename),
    posterUrl,
  };
}

export function isMediaStorageRemote(): boolean {
  return isSupabaseStorageConfigured();
}

export async function streamMediaFile(
  storedUrl: string,
  res: Response,
  req?: Request
): Promise<void> {
  const parsed = parseStorageMediaRef(storedUrl);
  if (parsed) {
    try {
      const ext = path.extname(parsed.objectKey).toLowerCase();
      const contentType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.webm'
              ? 'video/webm'
              : ext === '.mp4'
                ? 'video/mp4'
                : parsed.kind === 'avatars'
                  ? 'image/jpeg'
                  : 'video/mp4';

      const rangeHeader = req?.headers.range;
      const streamed = await supabaseStorageStream(
        bucketForKind(parsed.kind),
        parsed.objectKey,
        typeof rangeHeader === 'string' ? rangeHeader : undefined
      );

      res.status(streamed.status);
      res.setHeader('Content-Type', streamed.contentType ?? contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      const isPoster = ext === '.webp' || ext === '.jpg' || ext === '.jpeg' || ext === '.png';
      res.setHeader(
        'Cache-Control',
        isPoster ? 'private, max-age=604800, immutable' : 'private, max-age=86400'
      );
      if (streamed.contentRange) res.setHeader('Content-Range', streamed.contentRange);
      if (streamed.contentLength) res.setHeader('Content-Length', streamed.contentLength);
      res.send(streamed.body);
    } catch {
      res.status(404).json({ error: 'Archivo no encontrado en Storage' });
    }
    return;
  }

  const localSegment = storedUrl.startsWith('/api/files/avatars/')
    ? storedUrl.replace('/api/files/avatars/', '')
    : storedUrl.startsWith('/api/files/videos/')
      ? storedUrl.replace('/api/files/videos/', '')
      : null;

  if (!localSegment) {
    res.status(404).json({ error: 'Archivo no encontrado' });
    return;
  }

  const kind: MediaKind = storedUrl.includes('/avatars/') ? 'avatars' : 'videos';
  const filePath = resolveFilePath(kind, localSegment);
  if (!filePath) {
    res.status(404).json({ error: 'Archivo no encontrado' });
    return;
  }

  res.sendFile(filePath);
}

export async function localAvatarPathFromUpload(file: Express.Multer.File): Promise<string> {
  let buffer = file.buffer;
  if (
    buffer &&
    (file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp')
  ) {
    try {
      const { optimizeAvatar } = await import('./imageOptimizer.ts');
      const result = await optimizeAvatar(buffer);
      buffer = result.buffer;
    } catch {
      /* fallback to original buffer */
    }
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return avatarApiPath(filename);
}

export function localVideoPathFromUpload(file: Express.Multer.File): string {
  return videoApiPath(file.filename);
}

/** Delete exercise video + optional poster reference. */
export async function deleteExerciseMedia(
  videoUrl: string | null | undefined,
  posterUrl?: string | null
): Promise<void> {
  if (videoUrl) await deleteMediaFile(videoUrl);
  if (posterUrl) await deleteMediaFile(posterUrl);
}

/** Best-effort delete of a stored media reference (remote or local). */
export async function deleteMediaFile(storedUrl: string): Promise<void> {
  try {
    const parsed = parseStorageMediaRef(storedUrl);
    if (parsed) {
      await supabaseStorageRemove(bucketForKind(parsed.kind), parsed.objectKey);
      return;
    }

    const localSegment = storedUrl.startsWith('/api/files/avatars/')
      ? storedUrl.replace('/api/files/avatars/', '')
      : storedUrl.startsWith('/api/files/videos/')
        ? storedUrl.replace('/api/files/videos/', '')
        : null;

    if (!localSegment) return;

    const kind: MediaKind = storedUrl.includes('/avatars/') ? 'avatars' : 'videos';
    const filePath = resolveFilePath(kind, localSegment);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    /* ignore — DB reference may already be cleared */
  }
}
