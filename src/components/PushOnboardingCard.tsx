import { useEffect, useMemo, useState } from 'react';
import { Bell, Share } from 'lucide-react';
import { Button, Card } from './ui';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { iosNeedsHomeScreenInstall } from '../lib/pwaDisplay';

const DISMISS_KEY = 'gymapure_push_onboarding_dismissed';

/** Soft prompt on member home to enable web push / iOS home screen. */
export function PushOnboardingCard() {
  const { supported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  const iosNeedsHomeScreen = useMemo(() => iosNeedsHomeScreenInstall(), []);

  useEffect(() => {
    if (isSubscribed) {
      setDismissed(true);
      return;
    }
    // Don't hide the iOS install card just because PushManager is missing / denied in Safari.
    if (!iosNeedsHomeScreen && permission === 'denied') {
      setDismissed(true);
    }
  }, [isSubscribed, permission, iosNeedsHomeScreen]);

  const showIosInstall = iosNeedsHomeScreen && !dismissed && !isSubscribed;
  const showPushEnable =
    supported && !dismissed && !isSubscribed && permission !== 'denied' && !iosNeedsHomeScreen;

  if (!showIosInstall && !showPushEnable) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await subscribe();
      dismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="md" rounded="xl" className="border-brand/20 bg-brand/5">
      <div className="flex items-start gap-3">
        <div className="bg-brand/15 text-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          {showIosInstall ? (
            <Share className="h-4 w-4" aria-hidden />
          ) : (
            <Bell className="h-4 w-4" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {showIosInstall ? 'Añadir a Inicio para avisos' : 'Activa avisos en el teléfono'}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {showIosInstall ? (
              <>
                En iPhone, toca Compartir →{' '}
                <strong className="font-semibold">Añadir a Inicio</strong> y abre GymApure desde el
                icono. Luego podrás activar notificaciones de mensajes y recordatorios en Perfil →
                Seguridad.
              </>
            ) : (
              <>
                Recibe mensajes del gym y recordatorios aunque no tengas la app abierta. También
                puedes gestionarlo en Perfil → Seguridad.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {showPushEnable && (
              <Button size="sm" onClick={() => void enable()} disabled={busy}>
                {busy ? 'Activando…' : 'Activar notificaciones'}
              </Button>
            )}
            <Button
              size="sm"
              variant={showIosInstall ? 'secondary' : 'ghost'}
              onClick={dismiss}
              disabled={busy}
            >
              {showIosInstall ? 'Entendido' : 'Ahora no'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
