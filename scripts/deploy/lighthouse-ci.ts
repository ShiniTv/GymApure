/**
 * Lighthouse CI with performance budgets.
 * Usage: npm run build && npm run lighthouse:ci
 *
 * Gate (fails CI): /login — performance budgets enforced.
 *
 * Uses Playwright's Chromium when system Chrome is not installed (common on Windows CI/dev).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const DIST = path.join(process.cwd(), 'dist');
const PORT = 4173;

interface LighthouseTarget {
  path: string;
  label: string;
  perfMin: number;
  a11yMin: number;
  lcpMaxMs: number;
  /** Si true, no falla el job — solo imprime advertencias. */
  advisory?: boolean;
}

const TARGETS: LighthouseTarget[] = [
  {
    path: '/login',
    label: 'login',
    perfMin: 0.85,
    a11yMin: 0.95,
    lcpMaxMs: 2500,
  },
];

const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.svg', '.json']);

function resolveLighthouseCli(): string {
  const cliPath = path.join(process.cwd(), 'node_modules', 'lighthouse', 'cli', 'index.js');
  if (fs.existsSync(cliPath)) return cliPath;
  console.error('Lighthouse not installed. Run: npm install');
  return '';
}

function resolveChromePath(): string {
  const playwrightChrome = chromium.executablePath();
  if (playwrightChrome && fs.existsSync(playwrightChrome)) {
    console.log(`Using Playwright Chromium: ${playwrightChrome}`);
    return playwrightChrome;
  }

  console.error(
    'No Chrome found for Lighthouse.\n' +
      'Install Playwright Chromium: npx playwright install chromium'
  );
  return '';
}

function serveStatic(): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url?.split('?')[0] ?? '/';
      const filePath =
        urlPath === '/'
          ? path.join(DIST, 'index.html')
          : path.join(DIST, urlPath.replace(/^\//, ''));

      const send = (target: string, contentType: string) => {
        const raw = fs.readFileSync(target);
        const ext = path.extname(target);
        const acceptEncoding = req.headers['accept-encoding'] ?? '';
        const canGzip =
          COMPRESSIBLE.has(ext) && acceptEncoding.includes('gzip') && raw.length > 1024;

        if (canGzip) {
          const compressed = gzipSync(raw);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Encoding': 'gzip',
            Vary: 'Accept-Encoding',
          });
          res.end(compressed);
          return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(raw);
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
                  : ext === '.woff2'
                    ? 'font/woff2'
                    : ext === '.woff'
                      ? 'font/woff'
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

async function runLighthouse(
  url: string,
  reportPath: string,
  chromePath: string
): Promise<number> {
  const lighthouseCli = resolveLighthouseCli();
  if (!lighthouseCli) return 1;

  const profileDir = path.join(process.cwd(), '.lighthouse', 'chrome-profile');
  fs.mkdirSync(profileDir, { recursive: true });

  const args = [
    lighthouseCli,
    url,
    '--quiet',
    '--preset=desktop',
    `--chrome-flags=--headless --no-sandbox --disable-gpu --user-data-dir=${profileDir}`,
    '--only-categories=performance,accessibility,best-practices',
    '--output=json',
    `--output-path=${reportPath}`,
  ];

  const tmpDir = path.join(process.cwd(), '.lighthouse', 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'ignore', 'ignore'],
      shell: false,
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
        TEMP: tmpDir,
        TMP: tmpDir,
      },
    });
    child.on('error', (error) => {
      console.error(`Failed to launch Lighthouse: ${error.message}`);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

interface LighthouseReport {
  categories?: Record<string, { score?: number }>;
  audits?: Record<string, { numericValue?: number; score?: number }>;
}

function checkBudgets(report: LighthouseReport, target: LighthouseTarget): boolean {
  const perf = report.categories?.performance?.score ?? 0;
  const a11y = report.categories?.accessibility?.score ?? 0;
  const lcp = report.audits?.['largest-contentful-paint']?.numericValue ?? 0;

  const prefix = target.advisory ? `[${target.label} advisory]` : `[${target.label}]`;
  console.log(
    `${prefix} performance: ${(perf * 100).toFixed(0)}, accessibility: ${(a11y * 100).toFixed(0)}, LCP: ${Math.round(lcp)}ms`
  );

  let ok = true;
  const logIssue = (message: string) => {
    if (target.advisory) {
      console.warn(`${prefix} ${message}`);
    } else {
      console.error(`${prefix} ${message}`);
      ok = false;
    }
  };

  if (perf < target.perfMin) {
    logIssue(`Performance below ${target.perfMin * 100} (got ${(perf * 100).toFixed(0)})`);
  }
  if (a11y < target.a11yMin) {
    logIssue(`Accessibility below ${target.a11yMin * 100} (got ${(a11y * 100).toFixed(0)})`);
  }
  if (lcp > target.lcpMaxMs) {
    logIssue(`LCP above ${target.lcpMaxMs}ms (got ${Math.round(lcp)}ms)`);
  }

  return target.advisory ? true : ok;
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('Run npm run build first (dist missing).');
    process.exit(1);
  }

  const chromePath = resolveChromePath();
  if (!chromePath) {
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), '.lighthouse');
  fs.mkdirSync(outDir, { recursive: true });

  const server = await serveStatic();
  try {
    let budgetsOk = true;

    for (const target of TARGETS) {
      const reportPath = path.join(outDir, `${target.label}-report.json`);
      const code = await runLighthouse(
        `http://127.0.0.1:${PORT}${target.path}`,
        reportPath,
        chromePath
      );

      const reportExists = fs.existsSync(reportPath);
      if (code !== 0 && !reportExists) {
        console.error(`[${target.label}] Lighthouse exited with code ${code} (no report)`);
        if (!target.advisory) budgetsOk = false;
        continue;
      }

      if (code !== 0 && reportExists) {
        console.warn(
          `[${target.label}] Lighthouse exited with code ${code} (Windows Chrome cleanup EPERM ignored).`
        );
      }

      if (reportExists) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as LighthouseReport;
        budgetsOk = checkBudgets(report, target) && budgetsOk;
      }
    }

    if (!budgetsOk) {
      console.error('Lighthouse budgets failed.');
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

void main();
