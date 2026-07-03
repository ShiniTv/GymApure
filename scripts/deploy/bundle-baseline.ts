/**
 * Capture gzip bundle sizes after build for regression tracking.
 * Usage: npm run build && npm run bundle:baseline
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS_DIR = path.join(process.cwd(), 'dist', 'assets');
const BASELINE_PATH = path.join(process.cwd(), 'scripts', 'fixtures', 'bundle-baseline.json');
const MAX_REGRESSION_PCT = 5;

function gzipSize(filePath: string): number {
  return gzipSync(fs.readFileSync(filePath)).length;
}

function collectJsSizes(): Record<string, number> {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error('dist/assets missing — run npm run build first');
  }

  const sizes: Record<string, number> = {};
  for (const file of fs.readdirSync(ASSETS_DIR)) {
    if (file.endsWith('.js')) {
      sizes[file] = gzipSize(path.join(ASSETS_DIR, file));
    }
  }
  return sizes;
}

function totalGzip(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((a, b) => a + b, 0);
}

function main() {
  const sizes = collectJsSizes();
  const total = totalGzip(sizes);
  const payload = {
    capturedAt: new Date().toISOString(),
    totalGzipBytes: total,
    files: sizes,
  };

  if (!fs.existsSync(BASELINE_PATH)) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2));
    console.log(`Baseline created — total JS gzip: ${(total / 1024).toFixed(1)} KB`);
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
    totalGzipBytes: number;
  };
  const deltaPct = ((total - baseline.totalGzipBytes) / baseline.totalGzipBytes) * 100;

  console.log(`Total JS gzip: ${(total / 1024).toFixed(1)} KB (baseline ${(baseline.totalGzipBytes / 1024).toFixed(1)} KB)`);
  console.log(`Delta: ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`);

  if (deltaPct > MAX_REGRESSION_PCT) {
    console.error(`Bundle grew more than ${MAX_REGRESSION_PCT}% — review dist/stats.html`);
    process.exit(1);
  }
}

main();
