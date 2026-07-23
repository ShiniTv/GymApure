/** Shared iOS / PWA display helpers for push onboarding. */

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** iPhone/iPad Safari before “Añadir a Inicio” — PushManager usually unavailable. */
export function iosNeedsHomeScreenInstall(): boolean {
  return isIosDevice() && !isStandaloneDisplay();
}
