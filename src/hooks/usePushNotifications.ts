import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useToastOptional } from '../context/ToastContext';

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

  const subscribe = useCallback(async () => {
    if (!supported || !user) return;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
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
      toast?.success('Notificaciones activadas');
    } catch (err) {
      console.error('[push] subscribe error:', err);
      toast?.error('No se pudieron activar las notificaciones');
    }
  }, [supported, user, toast]);

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

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {
        /* push subscription probe may fail offline */
      });
  }, [supported, user]);

  return { supported, permission, isSubscribed, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}
