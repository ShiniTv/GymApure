import { resolveMediaUrl } from '../../lib/api';

export function formatWorkoutTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getExerciseEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.startsWith('/uploads/') || url.startsWith('/api/files/') || url.startsWith('sbmedia:')) {
    return resolveMediaUrl(url);
  }
  return url;
}

export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}
