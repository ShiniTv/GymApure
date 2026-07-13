/**
 * Verifica bloqueo de login tras 3 intentos fallidos (sin otras dependencias).
 * Requiere servidor: npm run dev
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

async function login(email: string, password: string): Promise<number> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.status;
}

async function main() {
  const email = `lockout-${Date.now()}@test.local`;
  const statuses: number[] = [];

  for (let i = 0; i < 4; i++) {
    statuses.push(await login(email, 'wrong-password'));
  }

  const [s1, s2, s3, s4] = statuses;
  const ok =
    s1 === 401 && s2 === 401 && s3 === 401 && s4 === 429;

  console.log('Intentos:', statuses.join(', '));
  if (ok) {
    console.log('PASS: 3 fallos permitidos, 4to bloqueado (429)');
    process.exit(0);
  }

  console.error('FAIL: se esperaba 401,401,401,429');
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
