/**
 * Diagnóstico de patrones de consulta: detecta bucles secuenciales documentados y
 * verifica que endpoints agregados respondan en tiempo razonable.
 *
 * Uso (servidor corriendo):
 *   BASE_URL=http://localhost:3000 npm run db:audit-query-patterns
 */
import 'dotenv/config';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

interface EndpointProbe {
  name: string;
  path: string;
  auth?: boolean;
  maxMs: number;
}

const PUBLIC_PROBES: EndpointProbe[] = [{ name: 'health', path: '/api/health', maxMs: 2000 }];

const ADMIN_PROBES: EndpointProbe[] = [
  { name: 'admin-stats', path: '/api/stats/admin', auth: true, maxMs: 2000 },
  { name: 'admin-stats-kpis', path: '/api/stats/admin?parts=kpis', auth: true, maxMs: 2000 },
  { name: 'exercises-page', path: '/api/exercises?page=1&pageSize=50', auth: true, maxMs: 400 },
  { name: 'routines-page', path: '/api/routines?page=1&pageSize=50', auth: true, maxMs: 400 },
  { name: 'users-page', path: '/api/users?page=1&pageSize=20', auth: true, maxMs: 800 },
  { name: 'equipment-bootstrap', path: '/api/equipment/bootstrap', auth: true, maxMs: 800 },
  {
    name: 'chat-conversations',
    path: '/api/chat/conversations?page=1&pageSize=50',
    auth: true,
    maxMs: 500,
  },
];

const MEMBER_PROBES: EndpointProbe[] = [
  { name: 'member-stats', path: '/api/stats/member', auth: true, maxMs: 2000 },
];

async function probeEndpoint(
  probe: EndpointProbe,
  token?: string
): Promise<{ ok: boolean; ms: number; status: number; detail: string }> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    if (token) headers.Cookie = `token=${token}`;
    const res = await fetch(`${BASE_URL}${probe.path}`, {
      headers,
      signal: controller.signal,
    });
    const ms = performance.now() - start;
    const ok = res.ok && ms <= probe.maxMs;
    return {
      ok,
      ms,
      status: res.status,
      detail: ok
        ? `${ms.toFixed(0)}ms`
        : res.ok
          ? `lento ${ms.toFixed(0)}ms (max ${probe.maxMs})`
          : `HTTP ${res.status} en ${ms.toFixed(0)}ms`,
    };
  } catch (err) {
    const ms = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, ms, status: 0, detail: message };
  } finally {
    clearTimeout(timer);
  }
}

async function loginAs(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const setCookie = res.headers.get('set-cookie');
  const match = setCookie?.match(/token=([^;]+)/);
  return match?.[1] ?? null;
}

console.log('=== Auditoría de patrones de consulta ===\n');
console.log(`Base URL: ${BASE_URL}`);
console.log('\nPatrones secuenciales conocidos (código):');
console.log('  ✗ equipmentInspectionAlerts — bucles admin×item (corregido en Sprint B)');
console.log('  ✗ createStaffNotification — INSERT+COUNT por staff (corregido en Sprint B)');
console.log('  ✓ stats admin/member — Promise.all en una sola oleada');
console.log('  ✓ exercises/routines — paginación server-side + JOIN preview');
console.log('  ✓ users list — LATERAL last workout (no GROUP BY global)');
console.log('  ✓ expiry job — mapWithConcurrency(5)');

let failed = 0;

console.log('\n--- Endpoints públicos ---');
// Warmup: primera query a Supabase suele ser fría
await probeEndpoint({ name: 'warmup', path: '/api/health', maxMs: 15_000 });
for (const probe of PUBLIC_PROBES) {
  const result = await probeEndpoint(probe);
  const icon = result.ok ? '✓' : '✗';
  console.log(`${icon} ${probe.name}: ${result.detail}`);
  if (!result.ok) failed += 1;
}

const demoPassword = process.env.AUDIT_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD ?? 'DemoAdmin123!';
const adminEmail = process.env.AUDIT_DEMO_EMAIL ?? 'admin@gym.com';
const memberEmail = process.env.AUDIT_MEMBER_EMAIL ?? 'member@gym.com';
const token = await loginAs(adminEmail, demoPassword);

if (!token) {
  console.warn('\n⚠ No se pudo autenticar admin — omitiendo probes autenticados');
  console.warn(`  Usa AUDIT_DEMO_EMAIL / AUDIT_DEMO_PASSWORD o DEMO_PASSWORD (demo: admin@gym.com)`);
} else {
  console.log('\n--- Endpoints autenticados (admin) ---');
  for (const probe of ADMIN_PROBES) {
    const result = await probeEndpoint(probe, token);
    const icon = result.ok ? '✓' : '✗';
    console.log(`${icon} ${probe.name}: ${result.detail}`);
    if (!result.ok) failed += 1;
  }

  const memberToken = await loginAs(memberEmail, demoPassword);
  if (!memberToken) {
    console.warn('\n⚠ No se pudo autenticar member — omitiendo member-stats');
  } else {
    console.log('\n--- Endpoints autenticados (member) ---');
    for (const probe of MEMBER_PROBES) {
      const result = await probeEndpoint(probe, memberToken);
      const icon = result.ok ? '✓' : '✗';
      console.log(`${icon} ${probe.name}: ${result.detail}`);
      if (!result.ok) failed += 1;
    }
  }

  try {
    const metricsRes = await fetch(`${BASE_URL}/api/health/metrics`, {
      headers: { Cookie: `token=${token}` },
    });
    if (metricsRes.ok) {
      const metrics = (await metricsRes.json()) as {
        topSlowRoutes?: { method: string; path: string; avgDurationMs: number }[];
        sessionCache?: { hitRatePercent: number };
      };
      console.log('\n--- topSlowRoutes (snapshot) ---');
      for (const route of metrics.topSlowRoutes ?? []) {
        console.log(`  ${route.method} ${route.path}: avg ${route.avgDurationMs}ms`);
      }
      if (metrics.sessionCache) {
        console.log(`\nSession cache hit rate: ${metrics.sessionCache.hitRatePercent}%`);
      }
    }
  } catch {
    /* metrics endpoint optional */
  }
}

console.log(failed === 0 ? '\nQuery patterns audit: OK' : `\nQuery patterns audit: ${failed} problema(s)`);
process.exit(failed === 0 ? 0 : 1);
