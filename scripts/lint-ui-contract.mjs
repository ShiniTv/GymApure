/**
 * UI contract lint — ad-hoc type sizes, Button height/type escapes,
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
const ROUNDED_FAT = /\brounded-(?:2xl|3xl)\b/;
/** Height / min-height overrides on Button (size tokens own height). */
const BTN_H = /\b(?:sm:|md:|lg:|xl:)?(?:min-h|h)-(?:\[[^\]]+\]|\d)/;
/** Type-scale overrides on Button. */
const BTN_TYPE = /\b(?:text-xs|text-small)\b/;
/** Card padding escape — use padding prop (`p-ds-*`), not Tailwind p-*. */
const CARD_PAD = /\b(?:!)?(?:sm:|md:|lg:|xl:)?p-(?:\[|\d)/;

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

function lineOf(text, index) {
  return text.slice(0, index).split(/\n/).length;
}

function snip(s) {
  return s.replace(/\s+/g, ' ').trim().slice(0, 120);
}

const hits = [];
for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (SKIP_FILE.some((re) => re.test(rel))) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\n/);
  const radiusOk = RADIUS_ALLOW.some((re) => re.test(rel));

  lines.forEach((line, i) => {
    const trimmed = line.trim().slice(0, 120);
    if (PX.test(line)) {
      hits.push(`${rel}:${i + 1}: [text-px] ${trimmed}`);
    }
    if (!radiusOk && ROUNDED_FAT.test(line)) {
      hits.push(`${rel}:${i + 1}: [rounded-fat] ${trimmed}`);
    }
  });

  for (const m of text.matchAll(/<Button\b[\s\S]*?>/g)) {
    const tag = m[0];
    const ln = lineOf(text, m.index ?? 0);
    if (BTN_H.test(tag)) {
      hits.push(`${rel}:${ln}: [button-h] ${snip(tag)}`);
    }
    if (BTN_TYPE.test(tag)) {
      hits.push(`${rel}:${ln}: [button-type] ${snip(tag)}`);
    }
  }

  for (const m of text.matchAll(/<Card\b[\s\S]*?>/g)) {
    const tag = m[0];
    if (!CARD_PAD.test(tag)) continue;
    // Allow only via padding= prop — className p-* / md:p-4 is escape
    if (!/\bclassName=/.test(tag)) continue;
    if (!/\bclassName=\{?[\s\S]*?\b(?:!)?(?:sm:|md:|lg:|xl:)?p-(?:\[|\d)/.test(tag)) continue;
    hits.push(`${rel}:${lineOf(text, m.index ?? 0)}: [card-pad] ${snip(tag)}`);
  }
}

if (hits.length) {
  console.error(`UI contract: ${hits.length} finding(s)\n`);
  for (const h of hits.slice(0, 120)) console.error(h);
  if (hits.length > 120) console.error(`… +${hits.length - 120} more`);
  process.exit(2);
}

console.log('UI contract: clean');
