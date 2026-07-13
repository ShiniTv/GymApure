import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { WifiOff } from 'lucide-react';
import clsx from 'clsx';

interface OfflineBannerProps {
  /** Position above the floating bottom nav pill on mobile shells */
  aboveBottomNav?: boolean;
}

export function OfflineBanner({ aboveBottomNav }: OfflineBannerProps) {
  const isOnline = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'fixed right-0 left-0 z-[55] flex items-center justify-center gap-2 bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg',
        aboveBottomNav
          ? 'offline-banner-above-nav bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'
          : 'bottom-0'
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>Sin conexión — algunos datos pueden no estar actualizados</span>
    </div>
  );
}
