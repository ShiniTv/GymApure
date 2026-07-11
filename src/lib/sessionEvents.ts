export const SESSION_REVOKED_EVENT = 'gymapure:session-revoked';

export const SESSION_MESSAGES = {
  loginElsewhere: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo.',
  accountInactive: 'Tu cuenta fue desactivada. Contacta al administrador.',
  expired: 'Tu sesión expiró. Inicia sesión de nuevo.',
} as const;

export interface SessionRevokedDetail {
  message?: string;
  reason?: 'login_elsewhere' | 'account_inactive' | 'expired';
}

export function dispatchSessionRevoked(detail?: SessionRevokedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_REVOKED_EVENT, { detail: detail ?? {} }));
}

export function onSessionRevoked(handler: (detail: SessionRevokedDetail) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<SessionRevokedDetail>).detail ?? {});
  };
  window.addEventListener(SESSION_REVOKED_EVENT, listener);
  return () => window.removeEventListener(SESSION_REVOKED_EVENT, listener);
}
