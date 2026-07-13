/**
 * Login as reception staff for integration tests (check-in via /api/reception).
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();

function parseSetCookies(res: Response): { token?: string; csrf?: string } {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const raw = cookies.length > 0 ? cookies.join(', ') : (res.headers.get('set-cookie') ?? '');

  const token = raw.match(/token=([^;,]+)/)?.[1];
  const csrf = raw.match(/csrf_token=([^;,]+)/)?.[1];

  return {
    token: token ? decodeURIComponent(token) : undefined,
    csrf: csrf ? decodeURIComponent(csrf) : undefined,
  };
}

export async function loginReceptionStaff(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: RECEPTION_EMAIL, password: RECEPTION_PASSWORD }),
  });

  if (res.status !== 200) {
    throw new Error(
      `No se pudo iniciar sesión como recepcionista (${RECEPTION_EMAIL}). Ejecuta npm run db:restore-demo`
    );
  }

  const { token, csrf } = parseSetCookies(res);
  if (!token || !csrf) throw new Error('Login recepcionista sin cookies token/csrf');
  return `token=${token}; csrf_token=${encodeURIComponent(csrf)}|${csrf}`;
}

function splitSession(raw: string): { cookie: string; csrfToken: string } {
  const [cookie, csrfToken] = raw.split('|');
  if (!cookie || !csrfToken) throw new Error('Sesión recepcionista inválida');
  return { cookie, csrfToken };
}

export async function receptionCheckIn(cookie: string, cedula: string) {
  const { cookie: sessionCookie, csrfToken } = splitSession(cookie);
  return fetch(`${BASE}/api/reception/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ cedula }),
  });
}

export async function receptionCheckOut(cookie: string, cedula: string) {
  const { cookie: sessionCookie, csrfToken } = splitSession(cookie);
  return fetch(`${BASE}/api/reception/check-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ cedula }),
  });
}
