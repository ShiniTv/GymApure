import { useEffect, useState } from 'react';
import { apiFetch, parseJsonResponse, resolveMediaUrl } from '../lib/api';
import { isHostedExerciseVideo } from '../lib/exerciseVideo';

interface SignedMediaState {
  url: string;
  loading: boolean;
  error: string | null;
}

/**
 * Resolves exercise video/poster refs to a playable URL.
 * Remote Storage (sbmedia:) uses short-lived signed URLs — no proxy through Render.
 */
export function useSignedExerciseMedia(storedRef: string | null | undefined): SignedMediaState {
  const [state, setState] = useState<SignedMediaState>({
    url: '',
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!storedRef) {
      setState({ url: '', loading: false, error: null });
      return;
    }

    if (!isHostedExerciseVideo(storedRef) || !storedRef.startsWith('sbmedia:')) {
      setState({ url: resolveMediaUrl(storedRef), loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ url: '', loading: true, error: null });

    void apiFetch(`/api/files/videos/signed-url?ref=${encodeURIComponent(storedRef)}`)
      .then((res) => parseJsonResponse<{ url: string }>(res))
      .then((data) => {
        if (!cancelled) {
          setState({ url: data.url, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            url: '',
            loading: false,
            error: err instanceof Error ? err.message : 'No se pudo cargar el video',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storedRef]);

  return state;
}
