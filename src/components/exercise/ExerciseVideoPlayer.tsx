import { useState } from 'react';
import { ExternalLink, Video } from 'lucide-react';
import {
  getHostedVideoSrc,
  getYouTubeEmbedUrl,
  isDirectVideoFileUrl,
  isHostedExerciseVideo,
} from '../../lib/exerciseVideo';
import { useSignedExerciseMedia } from '../../hooks/useSignedExerciseMedia';
import { resolveMediaUrl } from '../../lib/api';
import { Spinner } from '../ui/Spinner';

interface ExerciseVideoPlayerProps {
  url: string;
  posterUrl?: string | null;
  title?: string;
}

const playerShell =
  'aspect-video w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-black';

function HostedExerciseVideo({
  src,
  poster,
  title,
  loading,
  error,
}: {
  src: string;
  poster?: string;
  title: string;
  loading?: boolean;
  error?: string | null;
}) {
  const [buffering, setBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);

  if (loading) {
    return (
      <div className={`${playerShell} relative flex items-center justify-center bg-zinc-950`}>
        <Spinner size="xl" />
      </div>
    );
  }

  if (error || playbackError || !src) {
    return (
      <div
        className={`${playerShell} flex items-center justify-center bg-zinc-950 p-4 text-center`}
      >
        <p className="text-xs text-zinc-400">{playbackError ?? error ?? 'Video no disponible'}</p>
      </div>
    );
  }

  return (
    <div className={`${playerShell} relative`}>
      {buffering && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70"
          aria-hidden={!buffering}
        >
          {poster && !posterFailed && (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50"
              onError={() => setPosterFailed(true)}
            />
          )}
          <Spinner size="xl" className="relative z-10" />
        </div>
      )}
      <video
        src={src}
        poster={posterFailed ? undefined : poster}
        className="h-full w-full object-contain"
        controls
        playsInline
        preload="metadata"
        title={title}
        onCanPlay={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onError={() => {
          setBuffering(false);
          setPlaybackError('No se pudo reproducir el video');
        }}
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
  const hostedVideo = useSignedExerciseMedia(
    isHostedExerciseVideo(url) && url.startsWith('sbmedia:') ? url : null
  );
  const hostedPoster = useSignedExerciseMedia(posterUrl?.startsWith('sbmedia:') ? posterUrl : null);

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
    const src = url.startsWith('sbmedia:') ? hostedVideo.url : getHostedVideoSrc(url);
    const poster = posterUrl?.startsWith('sbmedia:')
      ? hostedPoster.url || undefined
      : posterUrl
        ? resolveMediaUrl(posterUrl)
        : undefined;

    return (
      <HostedExerciseVideo
        src={src}
        poster={poster}
        title={title}
        loading={url.startsWith('sbmedia:') && hostedVideo.loading}
        error={hostedVideo.error}
      />
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
          <p className="text-brand dark:text-brand flex items-center gap-1 text-xs font-medium">
            <ExternalLink className="h-3 w-3" />
            Enlace externo
          </p>
        </div>
      </div>
    </a>
  );
}
