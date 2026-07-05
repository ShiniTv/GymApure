import { canonicalCedula } from './cedulaUtils';

/** Canonical value encoded in membership badge QR codes. */
export function buildBadgeQrValue(cedula: string): string {
  return canonicalCedula(cedula) ?? cedula.trim().toUpperCase();
}

/**
 * Extract a cédula from a QR scan, manual paste, or legacy badge payloads.
 * Supports plain cédula, JSON `{ cedula, v }`, and URLs with `?cedula=`.
 */
export function parseBadgeScan(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { cedula?: unknown };
      if (typeof parsed.cedula === 'string' && parsed.cedula.trim()) {
        return canonicalCedula(parsed.cedula) ?? parsed.cedula.trim().toUpperCase();
      }
    } catch {
      // fall through
    }
  }

  if (trimmed.includes('cedula=')) {
    try {
      const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, 'https://local');
      const fromQuery = url.searchParams.get('cedula');
      if (fromQuery?.trim()) {
        return canonicalCedula(fromQuery) ?? fromQuery.trim().toUpperCase();
      }
    } catch {
      // fall through
    }
  }

  return canonicalCedula(trimmed) ?? (trimmed.length >= 5 ? trimmed.toUpperCase() : null);
}
