import { Bell, BellOff, Share } from 'lucide-react';
import { Button } from './ui';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { iosNeedsHomeScreenInstall } from '../lib/pwaDisplay';

export function PushNotificationsToggle() {
  const { supported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const needsHomeScreen = iosNeedsHomeScreenInstall();

  if (needsHomeScreen && !supported) {
    return (
      <div className="border-brand/20 bg-brand/5 flex items-start gap-2 rounded-lg border px-2.5 py-2">
        <Share className="text-brand mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          En iPhone: Compartir → <strong className="font-semibold">Añadir a Inicio</strong>, abre la
          app desde el icono y vuelve aquí para activar avisos de mensajes y recordatorios.
        </p>
      </div>
    );
  }

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
        {isSubscribed
          ? 'Avisos de mensajes y recordatorios activos'
          : 'Recibe mensajes y recordatorios del gym'}
      </span>
    </div>
  );
}
