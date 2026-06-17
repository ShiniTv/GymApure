/** Same-origin fetch that always sends session cookies. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { credentials: 'include', ...init });
}

export class ApiError extends Error {
  status: number;
  requestId?: string;
  details?: unknown;

  constructor(message: string, options: { status: number; requestId?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    requestId?: string;
    details?: unknown;
  };
  if (!res.ok) {
    throw new ApiError(data.error || `Error HTTP ${res.status}`, {
      status: res.status,
      requestId: data.requestId,
      details: data.details,
    });
  }
  return data;
}

/** Parse JSON without throwing on HTTP errors (kiosk, simulators, health checks). */
export async function parseJsonSafe<T = unknown>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

/** Parse JSON when the response is OK; otherwise null. */
export async function parseJsonOptional<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  return parseJsonResponse<T>(res);
}

export function toDisplayErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof ApiError) {
    return err.requestId ? `${err.message} (req: ${err.requestId})` : err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Normalize legacy /uploads/ paths to authenticated API routes. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/files/')) return url;
  if (url.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length);
    return `/api/files/videos/${filename}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
}

export function resolveAvatarUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/files/avatars/')) return url;
  if (url.startsWith('/uploads/avatars/')) {
    const filename = url.slice('/uploads/avatars/'.length);
    return `/api/files/avatars/${filename}`;
  }
  return resolveMediaUrl(url);
}

export function paymentProofUrl(paymentId: number): string {
  return `/api/payments/${paymentId}/proof`;
}

/** Download a CSV report (admin). Sends session cookies. */
export async function downloadReport(
  type: 'payments' | 'attendance' | 'members',
  options?: { from?: string; to?: string }
): Promise<void> {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  const qs = params.toString();
  const res = await apiFetch(`/api/reports/${type}${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `${type}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
