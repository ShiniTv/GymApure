import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { hapticLight } from '../lib/haptics';

interface OfflineBannerProps {
  /** Position above the floating bottom nav pill on mobile shells */
  aboveBottomNav?: boolean;
}

export function OfflineBanner({ aboveBottomNav }: OfflineBannerProps) {
  const isOnline = useOfflineStatus();
  const queryClient = useQueryClient();
  const [showRestored, setShowRestored] = useState(false);
  const wasOfflineRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowRestored(false);
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else if (wasOfflineRef.current) {
      // Pasó de estar offline a online: reconexión detectada
      wasOfflineRef.current = false;
      setShowRestored(true);
      hapticLight();

      // Sincronizar datos de fondo automáticamente
      void queryClient.invalidateQueries();

      timerRef.current = window.setTimeout(() => {
        setShowRestored(false);
        timerRef.current = null;
      }, 3500);
    }

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isOnline, queryClient]);

  const basePos = aboveBottomNav
    ? 'offline-banner-above-nav bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'
    : 'bottom-0';

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={clsx(
          'bg-danger animate-in fade-in slide-in-from-bottom-2 fixed right-0 left-0 z-[55] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white shadow-lg duration-200',
          basePos
        )}
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>Sin conexión — algunos datos pueden no estar actualizados</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={clsx(
          'animate-in fade-in slide-in-from-bottom-2 fixed right-0 left-0 z-[55] flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg duration-200',
          basePos
        )}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-white" aria-hidden />
        <span>Conexión restablecida · Sincronizando datos</span>
      </div>
    );
  }

  return null;
}
