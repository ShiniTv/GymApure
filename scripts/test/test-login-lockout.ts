/**
 * Verifica bloqueo de login tras 3 intentos fallidos (sin otras dependencias).
 * Requiere servidor: npm run dev
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

async function login(email: string, password: string): Promise<{
  status: number;
  locked_until?: number;
}> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as { locked_until?: number };
  return { status: res.status, locked_until: data.locked_until };
}

async function main() {
  const email = `lockout-${Date.now()}@test.local`;
  const results = [];

  for (let i = 0; i < 4; i++) {
    results.push(await login(email, 'wrong-password'));
  }

  const [s1, s2, s3, s4] = results;
  const ok =
    s1.status === 401 &&
    s2.status === 401 &&
    s3.status === 429 &&
    typeof s3.locked_until === 'number' &&
    s4.status === 429;

  console.log(
    'Intentos:',
    results.map((r) => r.status).join(', '),
    s3.locked_until ? `(locked_until=${s3.locked_until})` : ''
  );
  if (ok) {
    console.log('PASS: 2 fallos 401, 3er bloquea con locked_until, 4to 429');
    process.exit(0);
  }

  console.error('FAIL: se esperaba 401,401,429(+locked_until),429');
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
