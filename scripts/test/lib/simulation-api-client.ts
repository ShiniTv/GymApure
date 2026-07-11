/**
 * Cliente HTTP para el test integral del sistema.
 * Maneja autenticación, CSRF y sesiones por rol.
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ApiResult<T = unknown> {
  status: number;
  data: T;
  ok: boolean;
}

export class SimulationApiClient {
  private cookie = '';
  private csrfToken = '';
  readonly baseUrl: string;

  constructor(baseUrl = BASE) {
    this.baseUrl = baseUrl;
  }

  private buildCookieHeader(): string {
    const parts = this.cookie ? [this.cookie] : [];
    if (this.csrfToken) parts.push(`csrf_token=${encodeURIComponent(this.csrfToken)}`);
    return parts.join('; ');
  }

  private saveCookies(res: Response) {
    const cookies =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const entry of cookies) {
      if (entry.startsWith('token=')) this.cookie = entry.split(';')[0];
      if (entry.startsWith('csrf_token=')) {
        const raw = entry.split(';')[0].slice('csrf_token='.length);
        this.csrfToken = decodeURIComponent(raw);
      }
    }
  }

  clearSession() {
    this.cookie = '';
    this.csrfToken = '';
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResult<T>> {
    const cookieHeader = this.buildCookieHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };
    if (this.csrfToken && MUTATING_METHODS.has(method)) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data, ok: res.ok };
  }

  async login(email: string, password: string): Promise<ApiResult> {
    this.clearSession();
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    this.saveCookies(res);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
  }

  async logout(): Promise<ApiResult> {
    const result = await this.request('POST', '/api/auth/logout');
    this.clearSession();
    return result;
  }

  async me(): Promise<ApiResult<{ user?: { id: number; role: string; email: string } }>> {
    return this.request('GET', '/api/auth/me');
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: AbortSignal.timeout(5_000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async formPost<T = unknown>(path: string, form: FormData): Promise<ApiResult<T>> {
    const cookieHeader = this.buildCookieHeader();
    const headers: Record<string, string> = {};
    if (cookieHeader) headers.Cookie = cookieHeader;
    if (this.csrfToken) headers['x-csrf-token'] = this.csrfToken;

    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body: form });
    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data, ok: res.ok };
  }
}

export async function waitForServer(baseUrl = BASE, timeoutMs = 60_000): Promise<void> {
  const client = new SimulationApiClient(baseUrl);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await client.health()) return;
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`Servidor no disponible en ${baseUrl} tras ${timeoutMs / 1000}s`);
}
