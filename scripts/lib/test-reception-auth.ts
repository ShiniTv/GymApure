/**
 * Login as reception staff for integration tests (check-in via /api/reception).
 */
import 'dotenv/config';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();

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

  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArr = cookies.find((c) => c.startsWith('token='));
  if (fromArr) return fromArr.split(';')[0];

  const raw = res.headers.get('set-cookie');
  const match = raw?.match(/token=[^;]+/);
  if (!match) throw new Error('Login recepcionista sin cookie token');
  return match[0];
}

export async function receptionCheckIn(cookie: string, cedula: string) {
  return fetch(`${BASE}/api/reception/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ cedula }),
  });
}

export async function receptionCheckOut(cookie: string, cedula: string) {
  return fetch(`${BASE}/api/reception/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ cedula }),
  });
}
