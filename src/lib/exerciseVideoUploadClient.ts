import { apiFetch, parseJsonResponse } from './api';

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

export async function fetchExerciseMediaCapabilities(): Promise<ExerciseMediaCapabilities> {
  const res = await apiFetch('/api/exercises/media-capabilities');
  return parseJsonResponse<ExerciseMediaCapabilities>(res);
}

export async function uploadExerciseVideoDirect(file: File): Promise<string> {
  const contentType = file.type === 'video/webm' ? 'video/webm' : 'video/mp4';

  const sessionRes = await apiFetch('/api/exercises/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, fileSize: file.size }),
  });
  const session = await parseJsonResponse<{
    uploadUrl: string;
    token: string;
    videoRef: string;
  }>(sessionRes);

  const putRes = await fetch(session.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: file,
  });

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '');
    throw new Error(detail || 'Error al subir el video a almacenamiento');
  }

  return session.videoRef;
}

async function putStorageBlob(uploadUrl: string, token: string, body: Blob, contentType: string) {
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '');
    throw new Error(detail || 'Error al subir el archivo a almacenamiento');
  }
}

export async function uploadExercisePosterDirect(blob: Blob): Promise<string> {
  const contentType = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';

  const sessionRes = await apiFetch('/api/exercises/poster-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, fileSize: blob.size }),
  });
  const session = await parseJsonResponse<{
    uploadUrl: string;
    token: string;
    posterRef: string;
  }>(sessionRes);

  await putStorageBlob(session.uploadUrl, session.token, blob, contentType);
  return session.posterRef;
}

/** First-frame (or 1s) WebP/JPEG thumbnail for direct-upload videos (no FFmpeg on Render). */
export async function capturePosterFromVideoFile(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error('No se pudo leer el video para la miniatura'));
      video.addEventListener('error', fail, { once: true });
      video.addEventListener('loadeddata', () => resolve(), { once: true });
    });

    const seekTo = Number.isFinite(video.duration) && video.duration > 2 ? 1 : 0;
    if (seekTo > 0) {
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('seeked', () => resolve(), { once: true });
        video.addEventListener(
          'error',
          () => reject(new Error('No se pudo leer el video para la miniatura')),
          {
            once: true,
          }
        );
        video.currentTime = seekTo;
      });
    }

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 360;
    const width = Math.min(640, sourceWidth);
    const height = Math.max(1, Math.round((sourceHeight / sourceWidth) * width));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo capturar la miniatura');
    ctx.drawImage(video, 0, 0, width, height);

    const webp = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.8);
    });
    if (webp && webp.size > 0) return webp;

    const jpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
    });
    if (!jpeg || jpeg.size === 0) throw new Error('No se pudo generar la miniatura');
    return jpeg;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
