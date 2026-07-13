import {
  VIDEOS_BUCKET,
  STORAGE_MEDIA_PREFIX,
  supabaseCreateSignedDownloadUrl,
  supabaseCreateSignedUploadUrl,
} from './supabaseAdmin.ts';
import { isMediaStorageRemote, parseStorageMediaRef } from './mediaStorage.ts';
import {
  VIDEO_MAX_DURATION_SEC,
  VIDEO_MAX_OUTPUT_BYTES,
  VIDEO_MAX_UPLOAD_BYTES,
} from './videoConfig.ts';
import { isFfmpegAvailable } from './videoOptimizer.ts';

export const SIGNED_VIDEO_PLAYBACK_TTL_SEC = 600;

const ALLOWED_DIRECT_UPLOAD_MIMES = new Set(['video/mp4', 'video/webm']);

export interface ExerciseMediaCapabilities {
  track: 'direct_supabase' | 'local_multipart';
  directUpload: boolean;
  multipartUpload: boolean;
  signedPlayback: boolean;
  maxUploadBytes: number;
  maxOutputBytes: number;
  maxDurationSec: number;
  ffmpegOnServer: boolean;
  recommendedMaxMb: number;
}

export async function getExerciseMediaCapabilities(): Promise<ExerciseMediaCapabilities> {
  const remote = isMediaStorageRemote();
  const ffmpegOnServer = remote ? false : await isFfmpegAvailable();
  return {
    track: remote ? 'direct_supabase' : 'local_multipart',
    directUpload: remote,
    multipartUpload: !remote,
    signedPlayback: remote,
    maxUploadBytes: remote ? VIDEO_MAX_OUTPUT_BYTES : VIDEO_MAX_UPLOAD_BYTES,
    maxOutputBytes: VIDEO_MAX_OUTPUT_BYTES,
    maxDurationSec: VIDEO_MAX_DURATION_SEC,
    ffmpegOnServer,
    recommendedMaxMb: Math.round(VIDEO_MAX_OUTPUT_BYTES / (1024 * 1024)),
  };
}

export function buildExerciseVideoObjectKey(extension: '.mp4' | '.webm' = '.mp4'): string {
  return `exercises/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
}

export function buildExerciseVideoMediaRef(objectKey: string): string {
  return `${STORAGE_MEDIA_PREFIX}videos:${objectKey}`;
}

export function extensionForVideoMime(mime: string): '.mp4' | '.webm' {
  return mime === 'video/webm' ? '.webm' : '.mp4';
}

export function assertDirectUploadAllowed(contentType: string, fileSize: number): void {
  if (!isMediaStorageRemote()) {
    throw new Error('Upload directo solo disponible con Supabase Storage en producción.');
  }
  if (!ALLOWED_DIRECT_UPLOAD_MIMES.has(contentType)) {
    throw new Error('Formato no permitido. Usa MP4 o WebM.');
  }
  if (fileSize > VIDEO_MAX_OUTPUT_BYTES) {
    const maxMb = Math.round(VIDEO_MAX_OUTPUT_BYTES / (1024 * 1024));
    throw new Error(
      `El video supera ${maxMb} MB. Comprímelo antes de subir (máx. ${VIDEO_MAX_DURATION_SEC} s, 720p).`
    );
  }
}

export async function createExerciseVideoUploadSession(
  contentType: string,
  fileSize: number
): Promise<{
  uploadUrl: string;
  token: string;
  videoRef: string;
  objectKey: string;
}> {
  assertDirectUploadAllowed(contentType, fileSize);
  const objectKey = buildExerciseVideoObjectKey(extensionForVideoMime(contentType));
  const signed = await supabaseCreateSignedUploadUrl(VIDEOS_BUCKET, objectKey);
  return {
    uploadUrl: signed.signedUrl,
    token: signed.token,
    videoRef: buildExerciseVideoMediaRef(objectKey),
    objectKey,
  };
}

export function assertValidExerciseVideoRef(ref: string): { objectKey: string } {
  const parsed = parseStorageMediaRef(ref);
  if (parsed?.kind !== 'videos') {
    throw new Error('Referencia de video inválida.');
  }
  if (!parsed.objectKey.startsWith('exercises/')) {
    throw new Error('Ruta de video no permitida.');
  }
  return { objectKey: parsed.objectKey };
}

export async function createSignedExerciseMediaUrl(storedRef: string): Promise<{
  url: string;
  expiresIn: number;
}> {
  const parsed = parseStorageMediaRef(storedRef);
  if (parsed?.kind !== 'videos') {
    throw new Error('Referencia de media inválida');
  }
  const url = await supabaseCreateSignedDownloadUrl(
    VIDEOS_BUCKET,
    parsed.objectKey,
    SIGNED_VIDEO_PLAYBACK_TTL_SEC
  );
  return { url, expiresIn: SIGNED_VIDEO_PLAYBACK_TTL_SEC };
}
