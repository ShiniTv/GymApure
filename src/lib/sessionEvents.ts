export const SESSION_REVOKED_EVENT = 'gymapure:session-revoked';

export interface SessionRevokedDetail {
  message?: string;
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
