import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useToastOptional } from '../context/ToastContext';

interface SubscribeOptions {
  /** Skip permission prompt / success toast (re-subscribe after rotation). */
  silent?: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const toast = useToastOptional();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [supported] = useState(
    () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  );

  const subscribe = useCallback(
    async (options: SubscribeOptions = {}) => {
      if (!supported || !user) return;
      const silent = options.silent === true;

      try {
        let perm: NotificationPermission =
          'Notification' in window ? Notification.permission : 'denied';
        if (!silent) {
          perm = await Notification.requestPermission();
          setPermission(perm);
        } else {
          setPermission(perm);
        }
        if (perm !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }

        const res = await apiFetch('/api/push/vapid-key');
        const { publicKey } = await parseJsonResponse<{ publicKey: string }>(res);

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await apiFetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });

        setIsSubscribed(true);
        if (!silent) toast?.success('Notificaciones activadas');
      } catch (err) {
        console.error('[push] subscribe error:', err);
        if (!silent) toast?.error('No se pudieron activar las notificaciones');
      }
    },
    [supported, user, toast]
  );

  const unsubscribe = useCallback(async () => {
    if (!supported) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast?.success('Notificaciones desactivadas');
    } catch {
      toast?.error('Error al desactivar notificaciones');
    }
  }, [supported, toast]);

  useEffect(() => {
    if (!supported || !user) return;

    let cancelled = false;

    const syncSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setIsSubscribed(!!sub);
        setPermission(Notification.permission);

        // Permission granted but no push subscription (or lost after VAPID rotation).
        if (Notification.permission === 'granted' && !sub) {
          await subscribe({ silent: true });
        }
      } catch {
        /* push subscription probe may fail offline */
      }
    };

    void syncSubscription();

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-subscription-change') {
        void subscribe({ silent: true });
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, [supported, user, subscribe]);

  return { supported, permission, isSubscribed, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}
