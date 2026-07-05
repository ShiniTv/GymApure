import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules', 'zxing-wasm', 'dist', 'reader', 'zxing_reader.wasm');
const targetDir = path.join(root, 'public', 'zxing');
const target = path.join(targetDir, 'zxing_reader.wasm');

if (!fs.existsSync(source)) {
  console.error(`Missing ZXing WASM at ${source}. Run npm install zxing-wasm.`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Copied ZXing WASM to ${path.relative(root, target)}`);
