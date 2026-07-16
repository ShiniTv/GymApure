const DEFAULT_TIMEOUT = 15_000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1_000;

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCsrfTokenFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const match = new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`).exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function withCsrfHeaders(init: RequestInit = {}): RequestInit {
  const method = (init.method ?? 'GET').toUpperCase();
  if (!MUTATING_METHODS.has(method)) return init;

  const token = readCsrfTokenFromDocument();
  if (!token) return init;

  const headers = new Headers(init.headers ?? {});
  if (!headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  return { ...init, headers };
}

let authBootstrapComplete = false;
let onUnauthorized: (() => void) | null = null;

export function setAuthBootstrapComplete(complete: boolean) {
  authBootstrapComplete = complete;
}

export function registerUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function shouldHandleUnauthorized(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  return (
    !url.includes('/api/auth/login') &&
    !url.includes('/api/auth/register') &&
    !url.includes('/api/auth/forgot-password') &&
    !url.includes('/api/auth/reset-password')
  );
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { credentials: 'include', ...withCsrfHeaders(init) }).then((res) => {
    if (
      res.status === 401 &&
      authBootstrapComplete &&
      onUnauthorized &&
      shouldHandleUnauthorized(input)
    ) {
      onUnauthorized();
    }
    return res;
  });
}

export async function apiFetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number; retries?: number } = {}
): Promise<Response> {
  const timeout = init.timeout ?? DEFAULT_TIMEOUT;
  const retries = init.retries ?? MAX_RETRIES;
  const externalSignal = init.signal;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const combinedSignal = externalSignal
      ? combineAbortSignals(externalSignal, controller.signal)
      : controller.signal;

    try {
      const res = await fetch(input, {
        ...withCsrfHeaders(init),
        signal: combinedSignal,
        credentials: 'include',
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries && isRetryableError(lastError)) {
        await sleep(RETRY_DELAY * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  throw lastError ?? new Error('Network request failed');
}

function isRetryableError(err: Error): boolean {
  if (err.name === 'AbortError') return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
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

export async function parseJsonSafe<T = unknown>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

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

/** True only for real network failures (offline, DNS, aborted fetch), not HTTP error responses. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return false;
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      msg.includes('load failed')
    );
  }
  return false;
}

export function connectionOrApiError(err: unknown, fallback = 'Error inesperado'): string {
  if (isNetworkError(err)) return 'Error de conexión';
  return toDisplayErrorMessage(err, fallback);
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('sbmedia:videos:')) {
    const key = url.slice('sbmedia:videos:'.length);
    return `/api/files/media/videos?key=${encodeURIComponent(key)}`;
  }
  if (url.startsWith('/api/files/')) return url;
  if (url.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length);
    return `/api/files/videos/${filename}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
}

export function resolveEquipmentPhotoUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('sbmedia:equipment:')) {
    const key = url.slice('sbmedia:equipment:'.length);
    return `/api/files/media/equipment?key=${encodeURIComponent(key)}`;
  }
  if (url.startsWith('/api/files/avatars/')) return url;
  return resolveAvatarUrl(url);
}

export function resolveAvatarUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('sbmedia:avatars:')) {
    const key = url.slice('sbmedia:avatars:'.length);
    return `/api/files/media/avatars?key=${encodeURIComponent(key)}`;
  }
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
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? `${type}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
