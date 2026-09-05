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
  'aspect-video w-full rounded-[var(--radius-card)] overflow-hidden border border-border shadow-inner bg-black';

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
      className="border-border-subtle bg-surface-raised flex h-full min-h-[120px] items-center justify-between rounded-[var(--radius-card)] border p-4"
    >
      <div className="flex items-center gap-3">
        <div className="brand-solid rounded-[var(--radius-button)] p-2.5 shadow-sm shadow-zinc-900/10">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <p className="text-text text-sm font-semibold">Ver video tutorial</p>
          <p className="text-brand dark:text-brand flex items-center gap-1 text-xs font-medium">
            <ExternalLink className="h-3 w-3" />
            Enlace externo
          </p>
        </div>
      </div>
    </a>
  );
}
