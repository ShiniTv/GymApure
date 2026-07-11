#!/usr/bin/env tsx
/**
 * Test integral del sistema GymApure.
 *
 * Simula 2 meses de operación realista con:
 *   - 1 administrador
 *   - 1 recepcionista
 *   - 5 entrenadores
 *   - 100 miembros (20 por entrenador)
 *   - Distribución equitativa: principiantes, intermedios, avanzados
 *   - 6 días laborables por semana
 *
 * Uso:
 *   npm run test:full-system              # Simulación completa (requiere servidor)
 *   npm run test:full-system -- --fast    # 2 semanas en lugar de 2 meses
 *   npm run test:full-system -- --seed-only
 *   npm run test:full-system -- --skip-checklists
 *   npm run test:full-system -- --cleanup  # Elimina datos de simulación previos
 *
 * Requisitos:
 *   npm run db:migrate
 *   npm run dev  (en otra terminal, o usa --with-server)
 *   DEMO_PASSWORD o SIMULATION_PASSWORD en .env
 */
import 'dotenv/config';
import { spawn } from 'child_process';
import { formatDate, SIMULATION } from './lib/simulation-config.ts';
import { SimulationApiClient, waitForServer } from './lib/simulation-api-client.ts';
import {
  seedSimulationData,
  cleanupSimulationData,
  type SimSeedResult,
} from './lib/simulation-seed.ts';
import {
  runSimulation,
  verifyFeaturesViaApi,
  runLiveDaySample,
} from './lib/simulation-engine.ts';
import { buildReport, printReport, saveReport } from './lib/simulation-report.ts';
import { pool } from '../../src/db/index.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const args = process.argv.slice(2);
const FAST = args.includes('--fast');
const SEED_ONLY = args.includes('--seed-only');
const SKIP_CHECKLISTS = args.includes('--skip-checklists');
const CLEANUP = args.includes('--cleanup');
const WITH_SERVER = args.includes('--with-server');
const NO_CLEANUP_BEFORE = args.includes('--no-cleanup-before');

const CHECKLIST_SCRIPTS = [
  'test:smoke',
  'test:security-checklist',
  'test:reception-checklist',
  'test:payments-checklist',
  'test:chat-checklist',
  'test:memberships-checkin',
  'test:exchange-rate',
  'test:trainer-shifts',
  'test:routine-exercises',
  'test:email-checklist',
  'test:ux',
] as const;

function npmBin(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runChecklist(script: string): Promise<{ passed: boolean; output: string }> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    const child = spawn(npmBin(), ['run', script], {
      shell: process.platform === 'win32',
      env: { ...process.env, SMOKE_BASE_URL: BASE },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (d) => chunks.push(String(d)));
    child.stderr?.on('data', (d) => chunks.push(String(d)));
    child.on('exit', (code) => {
      resolve({ passed: code === 0, output: chunks.join('').slice(-2000) });
    });
    child.on('error', () => resolve({ passed: false, output: 'Error al ejecutar checklist' }));
  });
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
      /* already dead */
    }
    resolve();
  });
}

async function main() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     TEST INTEGRAL DEL SISTEMA — GymApure v2.5           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Configuración:');
  console.log(`  • Personal: 1 admin, 1 recepcionista, ${SIMULATION.staff.trainers} entrenadores`);
  console.log(
    `  • Miembros: ${SIMULATION.staff.trainers * SIMULATION.membersPerTrainer} (${SIMULATION.membersPerTrainer}/entrenador)`
  );
  console.log(
    `  • Niveles: ${SIMULATION.difficultyPerTrainer.Beginner} principiantes + ${SIMULATION.difficultyPerTrainer.Intermediate} intermedios + ${SIMULATION.difficultyPerTrainer.Advanced} avanzados por entrenador`
  );
  console.log(`  • Periodo: ${FAST ? '2 semanas (--fast)' : `${SIMULATION.simulationDays} días (~2 meses)`}`);
  console.log(`  • Jornada: ${SIMULATION.workDaysPerWeek} días/semana (lun-sáb)`);
  console.log('');

  let serverProcess: ReturnType<typeof spawn> | null = null;

  if (WITH_SERVER) {
    console.log('Levantando servidor de desarrollo...');
    serverProcess = spawn(npmBin(), ['run', 'dev'], {
      stdio: 'inherit',
      detached: process.platform !== 'win32',
      env: process.env,
    });
    await waitForServer(BASE);
    console.log('Servidor listo.\n');
  } else {
    const client = new SimulationApiClient(BASE);
    if (!(await client.health())) {
      console.error(
        `\nNo hay servidor en ${BASE}.\n\nOpciones:\n` +
          `  1. npm run dev  (otra terminal)\n` +
          `  2. npm run test:full-system -- --with-server\n`
      );
      process.exit(1);
    }
  }

  try {
    if (CLEANUP) {
      console.log('── Limpieza de datos de simulación previos ──');
      await cleanupSimulationData();
      console.log('  ✓ Limpieza completada\n');
      if (args.length === 1) {
        process.exit(0);
      }
    }

    if (!NO_CLEANUP_BEFORE && !CLEANUP) {
      console.log('── Preparación: limpiando simulación anterior ──');
      await cleanupSimulationData();
    }

    const simulationStart = new Date();
    simulationStart.setDate(simulationStart.getDate() - SIMULATION.simulationDays);
    const startDateStr = formatDate(simulationStart);

    console.log('\n── Fase 1-3: Seed de población ──');
    const seed: SimSeedResult = await seedSimulationData(startDateStr);

    if (SEED_ONLY) {
      console.log('\n✓ Seed completado (--seed-only). Datos listos para simulación manual.');
      process.exit(0);
    }

    const simulationStats = await runSimulation(seed, { fast: FAST });

    const apiVerification = await verifyFeaturesViaApi(seed, BASE);
    const liveSample = await runLiveDaySample(seed, BASE);

    const checklists: { name: string; passed: boolean; output?: string }[] = [];

    if (!SKIP_CHECKLISTS) {
      console.log('\n── Fase 7: Checklists existentes del proyecto ──');
      for (const script of CHECKLIST_SCRIPTS) {
        process.stdout.write(`  Ejecutando ${script}...`);
        const result = await runChecklist(script);
        checklists.push({ name: script, passed: result.passed, output: result.output });
        console.log(result.passed ? ' OK' : ' FAIL');
      }
    } else {
      console.log('\n  (--skip-checklists: omitiendo checklists del proyecto)');
    }

    const report = buildReport(seed, simulationStats, apiVerification, liveSample, checklists, startTime);
    printReport(report);

    const reportPath = saveReport(report);
    console.log(`\nReporte JSON guardado en: ${reportPath}`);

    if (report.overallStatus === 'FAIL') {
      process.exit(1);
    }
  } finally {
    if (serverProcess?.pid) {
      await killProcessTree(serverProcess.pid);
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nError en test integral:', err instanceof Error ? err.message : err);
  process.exit(1);
});
