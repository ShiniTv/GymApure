/**
 * Verifica utilidades de TMB/GET (Mifflin-St Jeor).
 */
import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  getAgeFromDob,
} from '../../src/lib/metabolicRate.ts';

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

const maleBmr = calculateBmrMifflinStJeor({
  sex: 'male',
  weightKg: 80,
  heightCm: 175,
  age: 30,
});
ok('TMB hombre referencia ~1749', maleBmr === 1749);

const femaleBmr = calculateBmrMifflinStJeor({
  sex: 'female',
  weightKg: 60,
  heightCm: 165,
  age: 30,
});
ok('TMB mujer referencia ~1320', femaleBmr === 1320);

const tdee = calculateTdee(maleBmr, 'moderate');
ok('GET moderado > TMB', tdee > maleBmr);
ok('GET moderado ~2711', tdee === 2711);

ok('edad desde dob', getAgeFromDob('1996-01-15', new Date('2026-07-09')) === 30);

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
