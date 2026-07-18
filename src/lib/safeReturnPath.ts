import { getDefaultRouteForRole, type UserRole } from './roles';

export type ReturnPathFrom = { pathname: string; search?: string } | string;

/**
 * Destino post-login seguro (anti open-redirect).
 * Solo rutas relativas de la app; rechaza //, backslash, schemes y /login.
 */
export function safeReturnPath(from: ReturnPathFrom | undefined | null, role: UserRole): string {
  const fallback = getDefaultRouteForRole(role);
  if (!from) return fallback;

  const raw = (
    typeof from === 'string' ? from : `${from.pathname ?? ''}${from.search ?? ''}`
  ).trim();
  if (!raw) return fallback;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (decoded.length > 512) return fallback;
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback;
  if (decoded.includes('\\') || decoded.includes('://')) return fallback;
  if (decoded.toLowerCase().startsWith('/login')) return fallback;

  const pathOnly = decoded.split(/[?#]/, 1)[0] ?? '';
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) return fallback;
  if (pathOnly.split('/').includes('..')) return fallback;

  return decoded;
}
