/**
 * Unit tests for per-exercise record helpers (Epley, best set, merge reps-at-weight).
 */
import {
  buildExerciseSummary,
  estimateOneRmEpley,
  isBetterSet,
  maxEstimatedOneRm,
  mergeRepsAtWeight,
  pickBestSet,
  roundHalfKg,
} from '../../src/lib/exerciseRecords.ts';

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

ok('Epley 1 rep = weight', estimateOneRmEpley(100, 1) === 100);
ok('Epley 100×5 ≈ 116.5', estimateOneRmEpley(100, 5) === 116.5);
ok('Epley 80×10 = 106.5', estimateOneRmEpley(80, 10) === roundHalfKg(80 * (1 + 10 / 30)));
ok('Epley reps 0 → 0', estimateOneRmEpley(100, 0) === 0);
ok('Epley weight negativo → 0', estimateOneRmEpley(-10, 5) === 0);

ok('isBetterSet: mayor peso gana', isBetterSet({ weight: 90, reps: 5 }, { weight: 80, reps: 10 }));
ok(
  'isBetterSet: mismo peso, más reps gana',
  isBetterSet({ weight: 80, reps: 8 }, { weight: 80, reps: 5 })
);
ok(
  'isBetterSet: no mejora',
  !isBetterSet({ weight: 70, reps: 12 }, { weight: 80, reps: 5 })
);
ok('isBetterSet: vs null', isBetterSet({ weight: 40, reps: 8 }, null));

const best = pickBestSet([
  { weight: 60, reps: 12 },
  { weight: 80, reps: 5 },
  { weight: 80, reps: 8 },
  { weight: 70, reps: 10 },
]);
ok('pickBestSet: 80×8', best?.weight === 80 && best?.reps === 8);

const merged = mergeRepsAtWeight([
  { weight: 80, reps: 5, source: 'log' },
  { weight: 80, reps: 8, source: 'manual' },
  { weight: 60, reps: 12, source: 'log' },
  { weight: 100, reps: 3, source: 'log' },
]);
ok('mergeRepsAtWeight: 3 pesos', merged.length === 3);
ok('mergeRepsAtWeight: 80 kg max reps 8', merged.find((r) => r.weight_kg === 80)?.max_reps === 8);
ok(
  'mergeRepsAtWeight: 80 kg source both',
  merged.find((r) => r.weight_kg === 80)?.source === 'both'
);
ok('mergeRepsAtWeight: orden desc por peso', merged[0]?.weight_kg === 100);

ok(
  'maxEstimatedOneRm toma el mayor Epley',
  maxEstimatedOneRm([
    { weight: 100, reps: 1 },
    { weight: 80, reps: 10 },
  ]) === estimateOneRmEpley(80, 10)
);

const summary = buildExerciseSummary(
  1,
  'Press banca',
  'pecho',
  [
    { weight: 60, reps: 10, date: '2026-01-01', session_id: 1, source: 'log' },
    { weight: 80, reps: 5, date: '2026-02-01', session_id: 2, source: 'log' },
    { weight: 85, reps: 3, date: '2026-03-01', session_id: null, source: 'manual' },
  ],
  2
);
ok('summary max weight 85', summary.max_weight_kg === 85);
ok('summary max weight reps 3', summary.max_weight_reps === 3);
ok('summary session_count 2', summary.session_count === 2);
ok('summary last_performed más reciente', summary.last_performed === '2026-03-01');
ok(
  'summary 1RM usa Epley máximo',
  summary.estimated_1rm_kg ===
    Math.max(
      estimateOneRmEpley(60, 10),
      estimateOneRmEpley(80, 5),
      estimateOneRmEpley(85, 3)
    )
);
ok('summary best_set es 85×3', summary.best_set?.weight === 85 && summary.best_set?.reps === 3);

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
