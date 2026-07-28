import { useCallback, useEffect, useRef, useState } from 'react';
import { hapticSuccess } from '../../lib/haptics';
import {
  clearRestNotification,
  listenRestNotificationActions,
  notifyRestEnded,
  startRestNotification,
} from '../../lib/restTimerNotifications';
import { clearRestSessionStorage, restStorageKey, workoutRestUrl } from './types';

export function useRestTimer(sessionId: number | null, routineParamId: string | undefined) {
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restDuration, setRestDuration] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const restEndedNotifiedRef = useRef(false);
  const addRestTimeRef = useRef<(seconds: number) => void>(() => undefined);
  const skipRestRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!isResting || restEndsAt == null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setRestTimer(remaining);
      if (remaining <= 0) {
        setIsResting(false);
        setRestEndsAt(null);
        if (!restEndedNotifiedRef.current) {
          restEndedNotifiedRef.current = true;
          hapticSuccess();
          notifyRestEnded(workoutRestUrl(routineParamId));
        }
        clearRestSessionStorage(sessionId);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', tick);
    };
  }, [isResting, restEndsAt, sessionId, routineParamId]);

  useEffect(() => {
    if (!sessionId || !isResting || restEndsAt == null) return;
    try {
      sessionStorage.setItem(
        restStorageKey(sessionId),
        JSON.stringify({ endsAt: restEndsAt, duration: restDuration })
      );
    } catch {
      /* ignore */
    }
  }, [sessionId, isResting, restEndsAt, restDuration]);

  useEffect(() => {
    if (!sessionId || isResting) return;
    try {
      const raw = sessionStorage.getItem(restStorageKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { endsAt?: number; duration?: number };
      if (typeof parsed.endsAt !== 'number') return;
      const remaining = Math.max(0, Math.ceil((parsed.endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        clearRestSessionStorage(sessionId);
        return;
      }
      restEndedNotifiedRef.current = false;
      setRestEndsAt(parsed.endsAt);
      setRestDuration(typeof parsed.duration === 'number' ? parsed.duration : remaining);
      setRestTimer(remaining);
      setIsResting(true);
      startRestNotification(parsed.endsAt, workoutRestUrl(routineParamId));
    } catch {
      /* ignore */
    }
  }, [sessionId, isResting, routineParamId]);

  useEffect(() => {
    if (!isResting) {
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      return;
    }

    const requestLock = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        /* unsupported / denied */
      }
    };

    void requestLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [isResting]);

  useEffect(() => {
    return listenRestNotificationActions({
      onAdd30: () => addRestTimeRef.current(30),
      onSkip: () => skipRestRef.current(),
    });
  }, []);

  useEffect(() => {
    return () => {
      clearRestNotification();
    };
  }, []);

  const startRestTimer = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      const endsAt = Date.now() + seconds * 1000;
      restEndedNotifiedRef.current = false;
      setRestDuration(seconds);
      setRestEndsAt(endsAt);
      setRestTimer(seconds);
      setIsResting(true);
      startRestNotification(endsAt, workoutRestUrl(routineParamId));
      if (typeof Notification !== 'undefined') {
        setNotifPermission(Notification.permission);
      }
    },
    [routineParamId]
  );

  const skipRest = useCallback(() => {
    setIsResting(false);
    setRestTimer(0);
    setRestEndsAt(null);
    clearRestNotification();
    clearRestSessionStorage(sessionId);
  }, [sessionId]);

  const addRestTime = useCallback(
    (seconds: number) => {
      setRestEndsAt((prev) => {
        const base = prev != null && prev > Date.now() ? prev : Date.now();
        const next = base + seconds * 1000;
        const remaining = Math.max(0, Math.ceil((next - Date.now()) / 1000));
        setRestTimer(remaining);
        setRestDuration((d) => d + seconds);
        restEndedNotifiedRef.current = false;
        startRestNotification(next, workoutRestUrl(routineParamId));
        return next;
      });
      setIsResting(true);
    },
    [routineParamId]
  );

  addRestTimeRef.current = addRestTime;
  skipRestRef.current = skipRest;

  const requestRestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted' && restEndsAt != null) {
        startRestNotification(restEndsAt, workoutRestUrl(routineParamId));
      }
    } catch {
      /* ignore */
    }
  }, [restEndsAt, routineParamId]);

  return {
    restTimer,
    restDuration,
    isResting,
    notifPermission,
    restEndsAt,
    startRestTimer,
    skipRest,
    addRestTime,
    requestRestNotifications,
  };
}
