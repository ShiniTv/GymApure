/** Must match server fallback in src/config/env.ts (development only). */
const DEV_KIOSK_FALLBACK = 'caribean-gym-dev-kiosk-key';

/**
 * Clave del kiosk para el cliente (Vite).
 * En desarrollo usa el mismo fallback que el servidor si no hay VITE_KIOSK_KEY.
 */
export function getKioskClientKey(): string {
  const fromVite = import.meta.env.VITE_KIOSK_KEY?.trim();
  if (fromVite && fromVite.length >= 16) {
    return fromVite;
  }
  if (import.meta.env.DEV) {
    return DEV_KIOSK_FALLBACK;
  }
  return '';
}
