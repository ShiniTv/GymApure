export {
  getExerciseEmbedUrl,
  getHostedVideoSrc,
  getYouTubeEmbedUrl,
  isDirectVideoFileUrl,
  isHostedExerciseVideo,
  isYouTubeUrl,
} from '../../lib/exerciseVideo';

export function formatWorkoutTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
