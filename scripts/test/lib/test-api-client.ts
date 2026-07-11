/**
 * Cliente HTTP compartido para scripts de test/checklist.
 * Maneja cookie de sesión + CSRF (cookie csrf_token + header x-csrf-token).
 */
import 'dotenv/config';

const DEFAULT_BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ApiResponse<T = Record<string, unknown>> {
  res: Response;
  data: T;
  status: number;
  ok: boolean;
}

export class TestApiClient {
  private tokenCookie = '';
  private csrfToken = '';
  readonly baseUrl: string;

  constructor(baseUrl = DEFAULT_BASE) {
    this.baseUrl = baseUrl;
  }

  /** Cookie header completo: token + csrf_token (requerido por cookie-parser en mutaciones). */
  get cookieHeader(): string {
    const parts = this.tokenCookie ? [this.tokenCookie] : [];
    if (this.csrfToken) parts.push(`csrf_token=${encodeURIComponent(this.csrfToken)}`);
    return parts.join('; ');
  }

  get csrf(): string {
    return this.csrfToken;
  }

  clearSession() {
    this.tokenCookie = '';
    this.csrfToken = '';
  }

  private saveCookies(res: Response) {
    const cookies =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const entry of cookies) {
      if (entry.startsWith('token=')) this.tokenCookie = entry.split(';')[0];
      if (entry.startsWith('csrf_token=')) {
        const raw = entry.split(';')[0].slice('csrf_token='.length);
        this.csrfToken = decodeURIComponent(raw);
      }
    }
  }

  async json<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
    options?: { skipCsrf?: boolean; extraHeaders?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.extraHeaders ?? {}),
    };
    const cookie = this.cookieHeader;
    if (cookie) headers.Cookie = cookie;
    if (this.csrfToken && MUTATING_METHODS.has(method) && !options?.skipCsrf) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { res, data, status: res.status, ok: res.ok };
  }

  /** Alias de json() para compatibilidad con simulation-engine. */
  request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
    options?: { skipCsrf?: boolean; extraHeaders?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.json<T>(method, path, body, options);
  }

  async formPost<T = Record<string, unknown>>(
    path: string,
    form: FormData,
    options?: { skipCsrf?: boolean }
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    const cookie = this.cookieHeader;
    if (cookie) headers.Cookie = cookie;
    if (this.csrfToken && !options?.skipCsrf) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body: form });
    const data = (await res.json().catch(() => ({}))) as T;
    return { res, data, status: res.status, ok: res.ok };
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    this.clearSession();
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    this.saveCookies(res);
    const data = await res.json().catch(() => ({}));
    return { res, data, status: res.status, ok: res.ok };
  }

  async logout(): Promise<ApiResponse> {
    const result = await this.json('POST', '/api/auth/logout');
    this.clearSession();
    return result;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: AbortSignal.timeout(5_000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export async function waitForServer(baseUrl = DEFAULT_BASE, timeoutMs = 60_000): Promise<void> {
  const client = new TestApiClient(baseUrl);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await client.health()) return;
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`Servidor no disponible en ${baseUrl} tras ${timeoutMs / 1000}s`);
}
