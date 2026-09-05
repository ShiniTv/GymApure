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
        <h2 className="text-text flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
          <Settings2 className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Notificaciones push</span>
        </h2>
      </div>
      <p className="text-text-muted text-small mb-3 leading-snug sm:text-xs">
        Recibe notificaciones en tu dispositivo cuando haya novedades (pagos, mensajes, accesos).
      </p>
      <div className="mt-auto">
        <PushNotificationsToggle />
      </div>
    </Card>
  );
}
