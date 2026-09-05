/**
 * UI contract lint — ad-hoc type sizes, Button height overrides,
 * inflated panel radii, and Card padding escapes.
 * Allowlist: charts (chartTheme), sheets/chat bubbles, marketing.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = join(root, 'src');

/** Skip entire files (charts use numeric SVG ticks). */
const SKIP_FILE = [
  /src[\\/]lib[\\/]chartTheme\.ts$/,
  /Chart\.tsx$/,
  /Charts\.tsx$/,
  /chartTheme/,
];

/**
 * rounded-2xl / rounded-3xl allowed only in sheets, pills, chat, marketing.
 * Match path segments (forward or backslash).
 */
const RADIUS_ALLOW = [
  /[\\/]Sheet\.tsx$/,
  /[\\/]ChatBubble\.tsx$/,
  /[\\/]Landing/,
  /[\\/]AuthShell/,
  /[\\/]RestTimerOverlay\.tsx$/,
  /[\\/]ExerciseVideoPlayer\.tsx$/,
  /[\\/]MemberBadgeScanView\.tsx$/,
  /[\\/]ScrollToTop\.tsx$/,
];

const PX = /text-\[\d+px\]/;
const BTN_H =
  /<Button\b[^>]*\b(?:className)=\{?["'`][^"'`]*\b(?:min-h-|h-(?:\[|\d))/;
const ROUNDED_FAT = /\brounded-(?:2xl|3xl)\b/;
/** Card with padding override in className — use padding prop instead. */
const CARD_PAD_ESCAPE =
  /<Card\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:!)?(?:md:|lg:|sm:)?p-(?:\[|\d)/;

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
  if (SKIP_FILE.some((re) => re.test(rel))) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\n/);
  const radiusOk = RADIUS_ALLOW.some((re) => re.test(rel));
  lines.forEach((line, i) => {
    const snip = line.trim().slice(0, 120);
    if (PX.test(line)) {
      hits.push(`${rel}:${i + 1}: [text-px] ${snip}`);
    }
    if (BTN_H.test(line)) {
      hits.push(`${rel}:${i + 1}: [button-h] ${snip}`);
    }
    if (!radiusOk && ROUNDED_FAT.test(line)) {
      hits.push(`${rel}:${i + 1}: [rounded-fat] ${snip}`);
    }
    if (CARD_PAD_ESCAPE.test(line)) {
      hits.push(`${rel}:${i + 1}: [card-pad] ${snip}`);
    }
  });
}

if (hits.length) {
  console.error(`UI contract: ${hits.length} finding(s)\n`);
  for (const h of hits.slice(0, 100)) console.error(h);
  if (hits.length > 100) console.error(`… +${hits.length - 100} more`);
  process.exit(2);
}

console.log('UI contract: clean');
