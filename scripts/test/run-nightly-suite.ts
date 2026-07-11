#!/usr/bin/env tsx
/**
 * Suite nocturna local — espejo de .github/workflows/nightly.yml
 * Levanta el servidor, ejecuta checklists extendidos + simulación rápida.
 *
 * Uso: npm run test:nightly
 * Recomendado con Mailpit: npm run mailpit:up
 */
import 'dotenv/config';
import { spawn } from 'child_process';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const SERVER_START_TIMEOUT_MS = 90_000;

const suites = [
  'test:e2e',
  'test:email-checklist',
  'test:payments-checklist',
  'test:chat-checklist',
  'test:memberships-checkin',
  'test:exchange-rate',
  'test:trainer-shifts',
  'test:routine-exercises',
  'test:ux',
] as const;

function npmBin(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function spawnNpm(args: string[], options: Parameters<typeof spawn>[2] = {}) {
  return spawn(npmBin(), args, {
    shell: process.platform === 'win32',
    env: { ...process.env, SMOKE_BASE_URL: BASE },
    ...options,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      /* retry */
    }
    await sleep(1_000);
  }
  throw new Error(`Servidor no healthy en ${SERVER_START_TIMEOUT_MS / 1000}s`);
}

function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', () =>
        resolve()
      );
      return;
    }
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      /* dead */
    }
    resolve();
  });
}

function run(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawnNpm(args, { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  SUITE NOCTURNA — GymApure                   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const server = spawnNpm(['run', 'dev'], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: process.env,
  });

  const failed: string[] = [];

  try {
    await waitForHealth();
    console.log('Servidor listo.\n');

    for (const suite of suites) {
      console.log(`\n── ${suite} ──`);
      if ((await run(['run', suite])) !== 0) failed.push(suite);
    }

    console.log('\n── test:full-system (fast) ──');
    if ((await run(['run', 'test:full-system', '--', '--fast'])) !== 0) {
      failed.push('test:full-system:fast');
    }
  } finally {
    if (server.pid) await killProcessTree(server.pid);
  }

  if (failed.length > 0) {
    console.error(`\n✗ Fallaron: ${failed.join(', ')}`);
    process.exit(1);
  }

  console.log('\n✓ Suite nocturna completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
