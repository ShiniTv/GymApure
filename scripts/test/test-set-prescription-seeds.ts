/**
 * Regresión: siembra de logs para rutinas estáticas (sin peso prescrito).
 * Sin weight_kg → '0' para poder confirmar la serie; pesos prescritos se conservan.
 */
import {
  buildPrescriptionLogSeeds,
  deriveSetPrescription,
} from '../../src/lib/setPrescription.ts';

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

const simpleSeeds = buildPrescriptionLogSeeds([
  { id: 10, sets: 4, reps: 15, set_prescription: null },
]);

ok('prescripción simple: 4 series', Object.keys(simpleSeeds).length === 4);
ok('prescripción simple: peso ausente → "0"', simpleSeeds['10-1']?.weight === '0');
ok('prescripción simple: reps = 15', simpleSeeds['10-1']?.reps === '15');
ok('prescripción simple: no completada', simpleSeeds['10-1']?.completed === false);
ok('prescripción simple: serie 4 también peso 0', simpleSeeds['10-4']?.weight === '0');

const detailedSeeds = buildPrescriptionLogSeeds([
  {
    id: 20,
    sets: 3,
    reps: 10,
    set_prescription: [
      { set_number: 1, weight_kg: 40, reps: 12 },
      { set_number: 2, weight_kg: 45, reps: 10 },
      { set_number: 3, weight_kg: null, reps: 8 },
    ],
  },
]);

ok('prescripción detallada: peso prescrito serie 1', detailedSeeds['20-1']?.weight === '40');
ok('prescripción detallada: reps serie 1', detailedSeeds['20-1']?.reps === '12');
ok('prescripción detallada: peso prescrito serie 2', detailedSeeds['20-2']?.weight === '45');
ok('prescripción detallada: peso null → "0"', detailedSeeds['20-3']?.weight === '0');
ok('prescripción detallada: reps serie 3', detailedSeeds['20-3']?.reps === '8');

const derived = deriveSetPrescription(3, 15);
const derivedSeeds = buildPrescriptionLogSeeds([
  { id: 30, sets: 3, reps: 15, set_prescription: derived },
]);
ok('derive + seeds: peso 0 sin weight_kg', derivedSeeds['30-2']?.weight === '0');
ok('derive + seeds: reps conservadas', derivedSeeds['30-2']?.reps === '15');

const zeroWeightSeeds = buildPrescriptionLogSeeds([
  {
    id: 40,
    sets: 1,
    reps: 15,
    set_prescription: [{ set_number: 1, weight_kg: 0, reps: 15 }],
  },
]);
ok('peso prescrito 0 se conserva como "0"', zeroWeightSeeds['40-1']?.weight === '0');

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
