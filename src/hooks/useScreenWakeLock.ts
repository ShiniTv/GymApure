import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScreenWakeLockOptions {
  enabled?: boolean;
}

/**
 * Screen WakeLock API Hook
 * Previene que el dispositivo suspenda o apague la pantalla mientras el usuario entrena.
 * Se re-solicita automáticamente al recuperar el foco o visibilidad.
 */
export function useScreenWakeLock({ enabled = true }: UseScreenWakeLockOptions = {}) {
  const [isSupported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported || !enabled || document.visibilityState !== 'visible') return;

    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
      }
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setIsActive(true);

      sentinel.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch {
      // Ignorar rechazos por batería baja o permisos del sistema operativo
      setIsActive(false);
    }
  }, [isSupported, enabled]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        /* ignore */
      } finally {
        wakeLockRef.current = null;
        setIsActive(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      void releaseWakeLock();
      return;
    }

    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      } else {
        setIsActive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
}
