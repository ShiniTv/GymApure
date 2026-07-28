import { Settings2 } from 'lucide-react';
import { Card } from '../../components/ui';
import { PushNotificationsToggle } from '../../components/PushNotificationsToggle';

export function SettingsPushCard() {
  return (
    <Card
      id="notificaciones-push"
      padding="sm"
      rounded="xl"
      className="flex min-w-0 scroll-mt-20 flex-col overflow-hidden md:p-4"
    >
      <div className="mb-2.5 flex min-w-0 items-center gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <Settings2 className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Notificaciones push</span>
        </h2>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
        Recibe notificaciones en tu dispositivo cuando haya novedades (pagos, mensajes, check-ins).
      </p>
      <div className="mt-auto">
        <PushNotificationsToggle />
      </div>
    </Card>
  );
}
