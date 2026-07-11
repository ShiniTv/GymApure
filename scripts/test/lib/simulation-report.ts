/**
 * Generación de reporte final del test integral del sistema.
 */
import fs from 'fs';
import path from 'path';
import type { SimSeedResult } from './simulation-seed.ts';
import type { SimulationStats } from './simulation-engine.ts';
import { totalDifficultyDistribution, SIMULATION } from './simulation-config.ts';

export interface FullTestReport {
  timestamp: string;
  duration_ms: number;
  population: {
    admins: number;
    receptionists: number;
    trainers: number;
    members: number;
    difficulty_distribution: Record<string, number>;
  };
  simulation: SimulationStats;
  apiVerification: { passed: number; failed: number };
  liveSample: { passed: number; failed: number };
  checklists: { name: string; passed: boolean; output?: string }[];
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  recommendations: string[];
}

export function buildRecommendations(report: Omit<FullTestReport, 'recommendations'>): string[] {
  const recs: string[] = [];

  if (report.apiVerification.failed > 0) {
    recs.push(
      'Revisar endpoints API que fallaron en la verificación — pueden indicar regresiones en RBAC o datos.'
    );
  }

  if (report.simulation.workoutSessions < report.simulation.attendanceRecords * 0.3) {
    recs.push(
      'La proporción entrenamientos/asistencias es baja — verificar flujo de workout en la app miembro.'
    );
  }

  if (report.simulation.chatMessages < 50) {
    recs.push(
      'Pocos mensajes de chat generados — evaluar visibilidad del módulo de mensajes para miembros y entrenadores.'
    );
  }

  if (report.simulation.nutritionLogs < 100) {
    recs.push(
      'Bajo uso de registro nutricional — considerar simplificar el flujo de log de comidas en UX.'
    );
  }

  recs.push(
    'Distribuir docs/UX-EVALUACION-CLIENTES.md a una muestra de 15-20 miembros (5 por nivel) para retroalimentación UX/UI.'
  );
  recs.push(
    'Priorizar correcciones en flujos con mayor fricción reportada por clientes antes de optimizaciones cosméticas.'
  );
  recs.push(
    'Ejecutar npm run test:ux:browser tras correcciones UX para validar en mobile, tablet y desktop.'
  );

  return recs;
}

export function printReport(report: FullTestReport): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  REPORTE FINAL — TEST INTEGRAL DEL SISTEMA');
  console.log('═'.repeat(60));
  console.log(`  Fecha: ${report.timestamp}`);
  console.log(`  Duración: ${(report.duration_ms / 1000).toFixed(1)}s`);
  console.log(`  Estado: ${report.overallStatus}`);
  console.log('');
  console.log('  POBLACIÓN');
  console.log(`    Admin: ${report.population.admins}`);
  console.log(`    Recepcionista: ${report.population.receptionists}`);
  console.log(`    Entrenadores: ${report.population.trainers}`);
  console.log(`    Miembros: ${report.population.members}`);
  console.log(
    `    Niveles: ${report.population.difficulty_distribution.Beginner} principiantes, ` +
      `${report.population.difficulty_distribution.Intermediate} intermedios, ` +
      `${report.population.difficulty_distribution.Advanced} avanzados`
  );
  console.log('');
  console.log('  SIMULACIÓN (2 meses, 6 días/semana)');
  console.log(`    Días laborables: ${report.simulation.workingDays}`);
  console.log(`    Asistencias: ${report.simulation.attendanceRecords}`);
  console.log(`    Entrenamientos: ${report.simulation.workoutSessions} (${report.simulation.workoutLogs} series)`);
  console.log(`    Logs nutrición: ${report.simulation.nutritionLogs}`);
  console.log(`    Mensajes chat: ${report.simulation.chatMessages}`);
  console.log(`    Pagos: ${report.simulation.paymentsReported} reportados, ${report.simulation.paymentsApproved} aprobados`);
  console.log(`    Mediciones: ${report.simulation.measurements}`);
  console.log('');
  console.log('  VERIFICACIÓN API');
  console.log(`    OK: ${report.apiVerification.passed} | FAIL: ${report.apiVerification.failed}`);
  console.log(`    Muestra en vivo: ${report.liveSample.passed} OK, ${report.liveSample.failed} FAIL`);
  console.log('');

  if (report.checklists.length > 0) {
    console.log('  CHECKLISTS EXISTENTES');
    for (const c of report.checklists) {
      console.log(`    ${c.passed ? 'OK' : 'FAIL'}  ${c.name}`);
    }
    console.log('');
  }

  console.log('  RECOMENDACIONES');
  for (const r of report.recommendations) {
    console.log(`    • ${r}`);
  }
  console.log('');
  console.log('  CREDENCIALES DE SIMULACIÓN');
  console.log(`    Contraseña: (SIMULATION_PASSWORD o DEMO_PASSWORD del .env)`);
  console.log(`    Admin: sim.admin@gym.test`);
  console.log(`    Recepcionista: sim.reception@gym.test`);
  console.log(`    Entrenadores: sim.trainer1@gym.test … sim.trainer5@gym.test`);
  console.log(`    Miembros: sim.t1.m1@gym.test … sim.t5.m20@gym.test`);
  console.log('');
  console.log('  EVALUACIÓN UX/UI');
  console.log('    Ver docs/UX-EVALUACION-CLIENTES.md para encuesta de retroalimentación.');
  console.log('═'.repeat(60));
}

export function saveReport(report: FullTestReport, outputDir?: string): string {
  const dir = outputDir ?? path.join(process.cwd(), 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `full-system-test-${report.timestamp.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  return filepath;
}

export function buildReport(
  seed: SimSeedResult,
  simulationStats: SimulationStats,
  apiVerification: { passed: number; failed: number },
  liveSample: { passed: number; failed: number },
  checklists: FullTestReport['checklists'],
  startTime: number
): FullTestReport {
  const dist = totalDifficultyDistribution();
  const totalFails =
    apiVerification.failed + liveSample.failed + checklists.filter((c) => !c.passed).length;

  const base = {
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    population: {
      admins: SIMULATION.staff.admins,
      receptionists: SIMULATION.staff.receptionists,
      trainers: SIMULATION.staff.trainers,
      members: seed.members.length,
      difficulty_distribution: dist,
    },
    simulation: simulationStats,
    apiVerification,
    liveSample,
    checklists,
    overallStatus: 'PASS' as FullTestReport['overallStatus'],
  };

  const recommendations = buildRecommendations(base);
  const overallStatus: FullTestReport['overallStatus'] =
    totalFails === 0 ? 'PASS' : totalFails <= 3 ? 'PARTIAL' : 'FAIL';

  return { ...base, overallStatus, recommendations };
}
