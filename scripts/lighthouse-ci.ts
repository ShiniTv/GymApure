/**
 * Lighthouse baseline for production UI (login shell).
 * Usage: npm run build && npm run lighthouse:ci
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist', 'public');
const PORT = 4173;

function serveStatic(): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url?.split('?')[0] ?? '/';
      const filePath =
        urlPath === '/'
          ? path.join(DIST, 'index.html')
          : path.join(DIST, urlPath.replace(/^\//, ''));

      const send = (target: string, contentType: string) => {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(target));
      };

      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          const type =
            ext === '.js'
              ? 'application/javascript'
              : ext === '.css'
                ? 'text/css'
                : ext === '.svg'
                  ? 'image/svg+xml'
                  : 'text/html';
          send(filePath, type);
          return;
        }
        send(path.join(DIST, 'index.html'), 'text/html');
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    server.listen(PORT, () => resolve(server));
    server.on('error', reject);
  });
}

async function runLighthouse(): Promise<number> {
  const outDir = path.join(process.cwd(), '.lighthouse');
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'login-report.json');

  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'lighthouse',
        `http://127.0.0.1:${PORT}/`,
        '--quiet',
        '--chrome-flags=--headless --no-sandbox',
        '--only-categories=performance,accessibility,best-practices',
        '--output=json',
        `--output-path=${reportPath}`,
      ],
      { stdio: 'inherit', shell: true }
    );
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('Run npm run build first (dist/public missing).');
    process.exit(1);
  }

  const server = await serveStatic();
  try {
    const code = await runLighthouse();
    const reportPath = path.join(process.cwd(), '.lighthouse', 'login-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
        categories?: Record<string, { score?: number }>;
      };
      const perf = report.categories?.performance?.score ?? 0;
      const a11y = report.categories?.accessibility?.score ?? 0;
      console.log(`Lighthouse scores — performance: ${(perf * 100).toFixed(0)}, accessibility: ${(a11y * 100).toFixed(0)}`);
      if (perf < 0.5) {
        console.warn('Performance score below 50 — review bundle and LCP.');
      }
    }
    process.exit(code);
  } finally {
    server.close();
  }
}

void main();
