/**
 * Verificación local end-to-end en un solo comando.
 * Levanta el servidor, espera healthcheck y ejecuta test:integration.
 */
import 'dotenv/config';
import { spawn } from 'child_process';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const SERVER_START_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

function npmBin(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl: string): Promise<void> {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // El servidor aun no esta disponible.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`El servidor no estuvo healthy en ${SERVER_START_TIMEOUT_MS / 1000}s (${baseUrl})`);
}

function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
      return;
    }
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      // Ignorar si ya termino.
    }
    resolve();
  });
}

function runIntegrationTests(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npmBin(), ['run', 'test:integration'], {
      stdio: 'inherit',
      env: { ...process.env, SMOKE_BASE_URL: baseUrl },
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`test:integration termino con codigo ${code ?? 'desconocido'}`));
    });
    child.on('error', (err) => reject(err));
  });
}

async function main() {
  console.log(`Verificación local E2E → ${BASE}`);
  const server = spawn(npmBin(), ['run', 'dev'], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: process.env,
  });

  try {
    await waitForHealth(BASE);
    console.log('Servidor healthy. Ejecutando test:integration...');
    await runIntegrationTests(BASE);
    console.log('Verificación local E2E completada.');
  } finally {
    if (server.pid) {
      await killProcessTree(server.pid);
    }
  }
}

main().catch((err) => {
  console.error('verify:local-e2e error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
