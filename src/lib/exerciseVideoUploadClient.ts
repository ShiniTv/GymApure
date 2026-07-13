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
