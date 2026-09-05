/**
 * UI contract lint — ad-hoc type sizes and Button height overrides.
 * Allowlist: this file's skip globs (charts use chartTheme numeric ticks).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = join(root, 'src');

const SKIP = [
  /src[\\/]lib[\\/]chartTheme\.ts$/,
  /Chart\.tsx$/,
  /Charts\.tsx$/,
  /chartTheme/,
];

const PX = /text-\[(?:9|10|11|13)px\]/;
const BTN_H =
  /<Button\b[^>]*\b(?:className)=\{?["'`][^"'`]*\b(?:min-h-|h-(?:\[|\d))/;

const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
}

walk(src);

const hits = [];
for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (SKIP.some((re) => re.test(rel))) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\n/);
  lines.forEach((line, i) => {
    if (PX.test(line) || BTN_H.test(line)) {
      hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

if (hits.length) {
  console.error(`UI contract: ${hits.length} finding(s)\n`);
  for (const h of hits.slice(0, 80)) console.error(h);
  if (hits.length > 80) console.error(`… +${hits.length - 80} more`);
  process.exit(2);
}

console.log('UI contract: clean');
