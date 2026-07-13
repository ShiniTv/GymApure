/**
 * Verifica utilidades de la barra de suscripción (días restantes + color).
 */
import {
  computeSubscriptionRemainingPercent,
  getSubscriptionBarStyle,
  formatRemainingDaysShort,
} from '../../src/lib/expiryUtils.ts';

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

const start = '2026-07-01';
const end = '2026-07-31';

ok('100% al inicio del plan', computeSubscriptionRemainingPercent(30, start, end) === 100);
ok('~17% con 5 días en plan de 30', computeSubscriptionRemainingPercent(5, start, end) === 17);
ok('0% sin días restantes', computeSubscriptionRemainingPercent(0, start, end) === 0);
ok('clamp máximo 100', computeSubscriptionRemainingPercent(40, start, end) === 100);

const full = getSubscriptionBarStyle(100);
ok('color verde a 100%', full.backgroundColor.includes('142') || full.backgroundColor.startsWith('hsl(142'));
ok('ancho 100%', full.widthPercent === 100);

const half = getSubscriptionBarStyle(50);
ok('ancho 50%', half.widthPercent === 50);

const empty = getSubscriptionBarStyle(0);
ok('color rojo a 0%', empty.backgroundColor.startsWith('hsl(0'));
ok('ancho 0%', empty.widthPercent === 0);

ok('texto 0 días', formatRemainingDaysShort(0) === 'Vence hoy');
ok('texto 1 día', formatRemainingDaysShort(1) === '1 día restante');
ok('texto plural', formatRemainingDaysShort(12) === '12 días restantes');

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
