import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button, Card } from './ui';
import { usePushNotifications } from '../hooks/usePushNotifications';

const DISMISS_KEY = 'gymapure_push_onboarding_dismissed';

/** Soft prompt on member home to enable web push. */
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

  useEffect(() => {
    if (isSubscribed || permission === 'denied') {
      setDismissed(true);
    }
  }, [isSubscribed, permission]);

  if (!supported || dismissed || isSubscribed || permission === 'denied') {
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
          <Bell className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            Activa avisos en el teléfono
          </p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Recibe mensajes del gym y recordatorios aunque no tengas la app abierta.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void enable()} disabled={busy}>
              {busy ? 'Activando…' : 'Activar notificaciones'}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
