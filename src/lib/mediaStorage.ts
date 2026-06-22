import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  isSupabaseStorageConfigured,
  AVATARS_BUCKET,
  VIDEOS_BUCKET,
  STORAGE_MEDIA_PREFIX,
  supabaseStorageDownload,
  supabaseStorageUpload,
} from './supabaseAdmin.ts';
import { avatarApiPath, videoApiPath, resolveFilePath } from './uploadStorage.ts';

export type MediaKind = 'avatars' | 'videos';

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
  if ((kind !== 'avatars' && kind !== 'videos') || !objectKey || objectKey.includes('..')) {
    return null;
  }
  return { kind, objectKey };
}

function bucketForKind(kind: MediaKind): string {
  return kind === 'avatars' ? AVATARS_BUCKET : VIDEOS_BUCKET;
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
  const ext = path.extname(file.originalname) || extensionFromMime(file.mimetype, kind);
  const objectKey = `${objectPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) {
    throw new Error('No se pudo leer el archivo subido');
  }

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

export function isMediaStorageRemote(): boolean {
  return isSupabaseStorageConfigured();
}

export async function streamMediaFile(storedUrl: string, res: Response): Promise<void> {
  const parsed = parseStorageMediaRef(storedUrl);
  if (parsed) {
    try {
      const buffer = await supabaseStorageDownload(bucketForKind(parsed.kind), parsed.objectKey);
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

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(buffer);
    } catch {
      res.status(404).json({ error: 'Archivo no encontrado en Storage' });
    }
    return;
  }

  const localSegment =
    storedUrl.startsWith('/api/files/avatars/')
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

export function localAvatarPathFromUpload(file: Express.Multer.File): string {
  return avatarApiPath(file.filename);
}

export function localVideoPathFromUpload(file: Express.Multer.File): string {
  return videoApiPath(file.filename);
}
