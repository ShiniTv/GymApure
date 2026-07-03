/**
 * Lighthouse CI with performance budgets.
 * Usage: npm run build && npm run lighthouse:ci
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const PORT = 4173;
const PERF_MIN = 0.9;
const A11Y_MIN = 0.95;
const LCP_MAX_MS = 2500;

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

async function runLighthouse(url: string, reportPath: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'lighthouse',
        url,
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

interface LighthouseReport {
  categories?: Record<string, { score?: number }>;
  audits?: Record<string, { numericValue?: number; score?: number }>;
}

function checkBudgets(report: LighthouseReport, label: string): boolean {
  const perf = report.categories?.performance?.score ?? 0;
  const a11y = report.categories?.accessibility?.score ?? 0;
  const lcp = report.audits?.['largest-contentful-paint']?.numericValue ?? 0;

  console.log(
    `[${label}] performance: ${(perf * 100).toFixed(0)}, accessibility: ${(a11y * 100).toFixed(0)}, LCP: ${Math.round(lcp)}ms`
  );

  let ok = true;
  if (perf < PERF_MIN) {
    console.error(`[${label}] Performance below ${PERF_MIN * 100} (got ${(perf * 100).toFixed(0)})`);
    ok = false;
  }
  if (a11y < A11Y_MIN) {
    console.error(`[${label}] Accessibility below ${A11Y_MIN * 100} (got ${(a11y * 100).toFixed(0)})`);
    ok = false;
  }
  if (lcp > LCP_MAX_MS) {
    console.error(`[${label}] LCP above ${LCP_MAX_MS}ms (got ${Math.round(lcp)}ms)`);
    ok = false;
  }
  return ok;
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('Run npm run build first (dist missing).');
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), '.lighthouse');
  fs.mkdirSync(outDir, { recursive: true });

  const server = await serveStatic();
  try {
    const loginReportPath = path.join(outDir, 'login-report.json');
    const code = await runLighthouse(`http://127.0.0.1:${PORT}/`, loginReportPath);

    let budgetsOk = true;
    if (fs.existsSync(loginReportPath)) {
      const report = JSON.parse(fs.readFileSync(loginReportPath, 'utf8')) as LighthouseReport;
      budgetsOk = checkBudgets(report, 'login') && budgetsOk;
    }

    if (!budgetsOk) {
      console.error('Lighthouse budgets failed.');
      process.exit(1);
    }

    process.exit(code);
  } finally {
    server.close();
  }
}

void main();
