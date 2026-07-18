/**
 * Local rest-timer notifications via the service worker (lock screen / shade).
 * Falls back to page Notification when no SW is active (e.g. Vite dev).
 */

const REST_TAG = 'workout-rest';
const UPDATE_INTERVAL_MS = 5_000;

export type RestSwMessage =
  | { type: 'rest-start'; endsAt: number; remaining: number; body: string; url: string }
  | { type: 'rest-update'; remaining: number; body: string; url?: string }
  | { type: 'rest-end'; url?: string }
  | { type: 'rest-clear' };

let endTimeoutId: number | null = null;
let updateIntervalId: number | null = null;

export function formatRestNotificationBody(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, '0')} restantes`;
  return `${s}s restantes`;
}

export function hasNotificationPermission(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function clearTimers(): void {
  if (endTimeoutId != null) {
    window.clearTimeout(endTimeoutId);
    endTimeoutId = null;
  }
  if (updateIntervalId != null) {
    window.clearInterval(updateIntervalId);
    updateIntervalId = null;
  }
}

function fallbackNotification(msg: RestSwMessage): void {
  if (!hasNotificationPermission()) return;
  try {
    if (msg.type === 'rest-clear') return;
    if (msg.type === 'rest-end') {
      new Notification('Descanso terminado', {
        body: '¡Listo para la siguiente serie!',
        tag: REST_TAG,
        icon: '/logo-mark-light.jpg',
      });
      return;
    }
    new Notification('Descanso', {
      body: msg.body,
      tag: REST_TAG,
      icon: '/logo-mark-light.jpg',
    });
  } catch {
    /* ignore */
  }
}

async function postToSw(msg: RestSwMessage): Promise<void> {
  if (!hasNotificationPermission()) return;
  if (!('serviceWorker' in navigator)) {
    fallbackNotification(msg);
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.active) {
      fallbackNotification(msg);
      return;
    }
    reg.active.postMessage(msg);
  } catch {
    fallbackNotification(msg);
  }
}

/** Start (or restart) rest countdown notifications aligned to endsAt. */
export function startRestNotification(endsAt: number, workoutUrl: string): void {
  clearTimers();
  if (!hasNotificationPermission()) return;

  const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  void postToSw({
    type: 'rest-start',
    endsAt,
    remaining,
    body: formatRestNotificationBody(remaining),
    url: workoutUrl,
  });

  const msUntilEnd = Math.max(0, endsAt - Date.now());
  endTimeoutId = window.setTimeout(() => {
    void postToSw({ type: 'rest-end', url: workoutUrl });
    clearTimers();
  }, msUntilEnd);

  updateIntervalId = window.setInterval(() => {
    const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (rem <= 0) {
      clearTimers();
      return;
    }
    void postToSw({
      type: 'rest-update',
      remaining: rem,
      body: formatRestNotificationBody(rem),
      url: workoutUrl,
    });
  }, UPDATE_INTERVAL_MS);
}

export function clearRestNotification(): void {
  clearTimers();
  void postToSw({ type: 'rest-clear' });
}

export function notifyRestEnded(workoutUrl?: string): void {
  clearTimers();
  void postToSw({ type: 'rest-end', url: workoutUrl });
}

export interface RestNotificationActions {
  onAdd30: () => void;
  onSkip: () => void;
}

/** Listen for +30s / Saltar from the lock-screen notification. */
export function listenRestNotificationActions(handlers: RestNotificationActions): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => undefined;
  }

  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown } | null;
    const type = typeof data?.type === 'string' ? data.type : null;
    if (type === 'rest-action-add30') handlers.onAdd30();
    if (type === 'rest-action-skip') handlers.onSkip();
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}
