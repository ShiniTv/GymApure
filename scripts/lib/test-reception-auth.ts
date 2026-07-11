/**
 * Login as reception staff for integration tests (check-in via /api/reception).
 */
import 'dotenv/config';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';
import { TestApiClient } from '../test/lib/test-api-client.ts';

const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();

export interface ReceptionSession {
  cookieHeader: string;
  csrfToken: string;
}

export async function loginReceptionStaff(baseUrl?: string): Promise<ReceptionSession> {
  const client = new TestApiClient(baseUrl);
  const login = await client.login(RECEPTION_EMAIL, RECEPTION_PASSWORD);

  if (login.status !== 200) {
    throw new Error(
      `No se pudo iniciar sesión como recepcionista (${RECEPTION_EMAIL}). Ejecuta npm run db:restore-demo`
    );
  }

  return { cookieHeader: client.cookieHeader, csrfToken: client.csrf };
}

function mutatingHeaders(session: ReceptionSession): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: session.cookieHeader,
  };
  if (session.csrfToken) headers['x-csrf-token'] = session.csrfToken;
  return headers;
}

export async function receptionCheckIn(session: ReceptionSession, cedula: string) {
  const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
  return fetch(`${base}/api/reception/check-in`, {
    method: 'POST',
    headers: mutatingHeaders(session),
    body: JSON.stringify({ cedula }),
  });
}

export async function receptionCheckOut(session: ReceptionSession, cedula: string) {
  const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
  return fetch(`${base}/api/reception/check-out`, {
    method: 'POST',
    headers: mutatingHeaders(session),
    body: JSON.stringify({ cedula }),
  });
}
