import { useState } from 'react';
import { ExternalLink, Video } from 'lucide-react';
import {
  getHostedVideoSrc,
  getYouTubeEmbedUrl,
  isDirectVideoFileUrl,
  isHostedExerciseVideo,
} from '../../lib/exerciseVideo';
import { resolveMediaUrl } from '../../lib/api';
import { Spinner } from '../ui/Spinner';

type ExerciseVideoPlayerProps = {
  url: string;
  posterUrl?: string | null;
  title?: string;
};

const playerShell =
  'aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-black';

function HostedExerciseVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title: string;
}) {
  const [buffering, setBuffering] = useState(true);

  return (
    <div className={`${playerShell} relative`}>
      {buffering && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70"
          aria-hidden={!buffering}
        >
          {poster && (
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          )}
          <Spinner size="xl" className="relative z-10" />
        </div>
      )}
      <video
        src={src}
        poster={poster}
        className="h-full w-full object-contain"
        controls
        playsInline
        preload="metadata"
        title={title}
        onCanPlay={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
      />
    </div>
  );
}

export function ExerciseVideoPlayer({
  url,
  posterUrl,
  title = 'Video tutorial',
}: ExerciseVideoPlayerProps) {
  const youtubeEmbed = getYouTubeEmbedUrl(url);
  const poster = posterUrl ? resolveMediaUrl(posterUrl) : undefined;

  if (youtubeEmbed) {
    return (
      <div className={playerShell}>
        <iframe
          src={youtubeEmbed}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  if (isHostedExerciseVideo(url) || isDirectVideoFileUrl(url)) {
    return (
      <HostedExerciseVideo src={getHostedVideoSrc(url)} poster={poster} title={title} />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full min-h-[160px] items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="flex items-center gap-4">
        <div className="brand-solid rounded-2xl p-4 shadow-lg shadow-zinc-900/20">
          <Video className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-white">Ver video tutorial</p>
          <p className="flex items-center gap-1 text-xs font-medium text-brand dark:text-brand">
            <ExternalLink className="h-3 w-3" />
            Enlace externo
          </p>
        </div>
      </div>
    </a>
  );
}
