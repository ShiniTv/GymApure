/**
 * Fails if hashed JS chunks in dist/assets exceed budgets (Linear speed gate).
 * Budgets are uncompressed ceilings with headroom over the F0 baseline — catch regressions, not aspirational cuts.
 * Usage: npm run build && npm run bundle:budget
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.join(process.cwd(), 'dist', 'assets');

/** Soft ceilings for critical / named chunks (bytes, uncompressed). */
const BUDGETS: { match: RegExp; maxBytes: number; label: string }[] = [
  { match: /^index-.*\.js$/, maxBytes: 520_000, label: 'entry index' },
  { match: /^vendor-.*\.js$/, maxBytes: 260_000, label: 'vendor' },
  { match: /^Layout-.*\.js$/, maxBytes: 160_000, label: 'Layout' },
  { match: /^AdminDashboard-.*\.js$/, maxBytes: 100_000, label: 'AdminDashboard' },
];

/** Absolute hard cap for any single JS asset (except charts/qr which are lazy). */
const HARD_CAP_BYTES = 550_000;
const HARD_CAP_EXEMPT = /charts|qr-scanner|qr-display/;

function main() {
  if (!fs.existsSync(ASSETS)) {
    console.error('dist/assets missing. Run npm run build first.');
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
  let failed = false;
  const rows: { file: string; kb: string; note: string }[] = [];

  for (const file of files) {
    const size = fs.statSync(path.join(ASSETS, file)).size;
    const kb = (size / 1024).toFixed(1);

    for (const budget of BUDGETS) {
      if (budget.match.test(file) && size > budget.maxBytes) {
        failed = true;
        rows.push({
          file,
          kb,
          note: `FAIL ${budget.label} > ${(budget.maxBytes / 1024).toFixed(0)} KB`,
        });
      }
    }

    if (!HARD_CAP_EXEMPT.test(file) && size > HARD_CAP_BYTES) {
      failed = true;
      rows.push({
        file,
        kb,
        note: `FAIL hard cap > ${(HARD_CAP_BYTES / 1024).toFixed(0)} KB`,
      });
    }
  }

  if (rows.length) {
    console.log('Bundle budget violations:');
    for (const r of rows) console.log(`  ${r.file}  ${r.kb} KB  ${r.note}`);
  } else {
    console.log(`Bundle budgets OK (${files.length} JS assets checked).`);
  }

  process.exit(failed ? 1 : 0);
}

main();
