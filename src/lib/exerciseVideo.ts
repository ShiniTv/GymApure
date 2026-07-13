import { resolveMediaUrl } from './api';

export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = regExp.exec(url);
  return match?.[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

/** Videos stored in Supabase Storage or local uploads — served via authenticated API. */
export function isHostedExerciseVideo(url: string): boolean {
  return url.startsWith('/uploads/') || url.startsWith('/api/files/') || url.startsWith('sbmedia:');
}

export function isDirectVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

export function getHostedVideoSrc(url: string): string {
  return resolveMediaUrl(url);
}

/** @deprecated Use getYouTubeEmbedUrl or getHostedVideoSrc instead */
export function getExerciseEmbedUrl(url: string): string {
  if (!url) return '';
  const yt = getYouTubeEmbedUrl(url);
  if (yt) return yt;
  if (isHostedExerciseVideo(url) || isDirectVideoFileUrl(url)) {
    return getHostedVideoSrc(url);
  }
  return url;
}
