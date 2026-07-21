import { Bell, BellOff } from 'lucide-react';
import { Button } from './ui';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushNotificationsToggle() {
  const { supported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) {
    return (
      <p className="text-[11px] text-zinc-400">Este navegador no soporta notificaciones push.</p>
    );
  }

  if (permission === 'denied') {
    return (
      <p className="text-[11px] leading-snug text-red-500">
        Notificaciones bloqueadas. Actívalas desde la configuración del navegador.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
      <Button
        type="button"
        variant={isSubscribed ? 'secondary' : 'primary'}
        size="sm"
        onClick={isSubscribed ? () => void unsubscribe() : () => void subscribe()}
        className="h-9 min-h-9 shrink-0"
      >
        {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        <span>{isSubscribed ? 'Desactivar' : 'Activar'}</span>
      </Button>
      <span className="min-w-0 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        {isSubscribed ? 'Notificaciones activas' : 'Notificaciones inactivas'}
      </span>
    </div>
  );
}
