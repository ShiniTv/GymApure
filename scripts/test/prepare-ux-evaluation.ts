#!/usr/bin/env tsx
/**
 * Genera manifiesto de cuentas para la encuesta UX (docs/UX-EVALUACION-CLIENTES.md).
 * Usa datos de simulación en BD o cuentas demo como fallback.
 *
 * Uso:
 *   npm run ux:prepare
 *   npm run ux:prepare -- --samples 5   # miembros por nivel (default 5)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool, query } from '../../src/db/index.ts';
import { SIMULATION } from './lib/simulation-config.ts';

const args = process.argv.slice(2);
const samplesPerLevel = parseInt(
  args.find((a) => a.startsWith('--samples='))?.split('=')[1] ??
    (args.includes('--samples') ? args[args.indexOf('--samples') + 1] : '5'),
  10
);

interface EvalAccount {
  email: string;
  full_name: string;
  role: string;
  difficulty?: string;
  trainer_email?: string;
}

async function loadSimulationMembers(): Promise<EvalAccount[]> {
  const domain = SIMULATION.emailDomain;
  const { rows } = await query<{
    email: string;
    full_name: string;
    role: string;
    difficulty: string | null;
    trainer_email: string | null;
  }>(
    `SELECT u.email, u.full_name, u.role, r.difficulty, t.email AS trainer_email
     FROM users u
     LEFT JOIN LATERAL (
       SELECT rt.difficulty
       FROM user_routines ur
       JOIN routines rt ON rt.id = ur.routine_id
       WHERE ur.user_id = u.id
       ORDER BY ur.start_date DESC NULLS LAST
       LIMIT 1
     ) r ON true
     LEFT JOIN users t ON t.id = (
       SELECT rt.trainer_id FROM user_routines ur
       JOIN routines rt ON rt.id = ur.routine_id
       WHERE ur.user_id = u.id
       ORDER BY ur.start_date DESC NULLS LAST
       LIMIT 1
     )
     WHERE u.email LIKE $1 AND u.role = 'member' AND u.status = 'active'
     ORDER BY r.difficulty NULLS LAST, u.email`,
    [`sim.%@${domain}`]
  );

  return rows.map((r) => ({
    email: r.email,
    full_name: r.full_name,
    role: r.role,
    difficulty: r.difficulty ?? undefined,
    trainer_email: r.trainer_email ?? undefined,
  }));
}

function pickSamples(members: EvalAccount[], perLevel: number): EvalAccount[] {
  const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
  const picked: EvalAccount[] = [];
  for (const level of levels) {
    const poolLevel = members.filter((m) => m.difficulty === level);
    picked.push(...poolLevel.slice(0, perLevel));
  }
  return picked;
}

async function main() {
  console.log('── Preparación encuesta UX ──\n');

  let members = await loadSimulationMembers();
  const usingSimulation = members.length > 0;

  if (!usingSimulation) {
    console.log('  No hay cuentas sim.* — usando demo member@gym.com');
    members = [
      {
        email: 'member@gym.com',
        full_name: 'Demo Member',
        role: 'member',
        difficulty: 'Beginner',
      },
    ];
  }

  const staff: EvalAccount[] = usingSimulation
    ? [
        { email: `sim.admin@${SIMULATION.emailDomain}`, full_name: 'Admin Sim', role: 'admin' },
        {
          email: `sim.reception@${SIMULATION.emailDomain}`,
          full_name: 'Recepción Sim',
          role: 'receptionist',
        },
        ...Array.from({ length: SIMULATION.staff.trainers }, (_, i) => ({
          email: `sim.trainer${i + 1}@${SIMULATION.emailDomain}`,
          full_name: `Entrenador ${i + 1}`,
          role: 'trainer',
        })),
      ]
    : [
        { email: 'admin@gym.com', full_name: 'Admin Demo', role: 'admin' },
        { email: 'receptionist@gym.com', full_name: 'Recepción Demo', role: 'receptionist' },
        { email: 'trainer@gym.com', full_name: 'Trainer Demo', role: 'trainer' },
      ];

  const sampleMembers = pickSamples(members, samplesPerLevel);

  const manifest = {
    generated_at: new Date().toISOString(),
    password_hint: 'SIMULATION_PASSWORD o DEMO_PASSWORD del .env',
    survey_doc: 'docs/UX-EVALUACION-CLIENTES.md',
    recommendation: `Distribuir a ${sampleMembers.length} miembros (${samplesPerLevel} por nivel) + opcional 2 staff`,
    staff,
    evaluators_recommended: sampleMembers,
    all_simulation_members_count: members.length,
  };

  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const filename = `ux-eval-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const outPath = path.join(reportsDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log(`  Miembros simulación en BD: ${members.length}`);
  console.log(`  Muestra recomendada: ${sampleMembers.length} evaluadores`);
  console.log(`  Manifiesto: ${outPath}\n`);

  console.log('  Evaluadores sugeridos:');
  for (const m of sampleMembers) {
    console.log(`    • [${m.difficulty ?? '?'}] ${m.email}`);
  }
  console.log('\n  Comparte docs/UX-EVALUACION-CLIENTES.md con la muestra.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
