import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { WifiOff } from 'lucide-react';
import clsx from 'clsx';

interface OfflineBannerProps {
  memberNav?: boolean;
}

export function OfflineBanner({ memberNav }: OfflineBannerProps) {
  const isOnline = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'fixed left-0 right-0 z-[55] flex items-center justify-center gap-2 bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg',
        memberNav ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))]' : 'bottom-0'
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>Sin conexión — algunos datos pueden no estar actualizados</span>
    </div>
  );
}
