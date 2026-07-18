/**
 * UX-QA #16–18: equipamiento (registro + sin duplicados) y override BCV.
 * Requiere servidor en marcha + demo/admin checklist.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';

let cookie = '';
let csrfToken = '';
let passed = 0;
let failed = 0;

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function jsonApi(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
  };
  if (csrfToken && MUTATING.has(method)) {
    headers['x-csrf-token'] = csrfToken;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const parts: string[] = [];
  for (const entry of cookies) {
    if (entry.startsWith('token=')) {
      parts.push(entry.split(';')[0]);
    }
    if (entry.startsWith('csrf_token=')) {
      const raw = entry.split(';')[0].slice('csrf_token='.length);
      csrfToken = decodeURIComponent(raw);
      parts.push(entry.split(';')[0]);
    }
  }
  if (parts.length) cookie = parts.join('; ');
}

async function ensureAdmin() {
  const login = await jsonApi('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (login.res.status === 200) {
    saveCookie(login.res);
    return true;
  }
  // Fallback: demo admin from restore-demo
  const demo = await jsonApi('POST', '/api/auth/login', {
    email: process.env.DEMO_ADMIN_EMAIL ?? 'admin@gymapure.demo',
    password: process.env.DEMO_PASSWORD ?? 'Demo1234!',
  });
  if (demo.res.status === 200) {
    saveCookie(demo.res);
    return true;
  }
  return false;
}

async function main() {
  console.log('=== Equipment + BCV checklist (UX-QA #16–18) ===\n');

  const loggedIn = await ensureAdmin();
  ok('Login admin', loggedIn);
  if (!loggedIn) {
    console.error('\nNo se pudo autenticar. Restaura demo o crea checklist-admin.');
    process.exit(1);
  }

  const catalog = await jsonApi('GET', '/api/equipment/catalog');
  ok('GET catálogo equipos', catalog.res.status === 200);
  const catalogItems = Array.isArray(catalog.data)
    ? catalog.data
    : ((catalog.data as { items?: { id: number; name: string }[] }).items ?? []);
  ok('Catálogo con al menos 1 tipo', catalogItems.length > 0, `count=${catalogItems.length}`);

  const existingList = await jsonApi('GET', '/api/equipment');
  const existingRows = Array.isArray(existingList.data)
    ? existingList.data
    : ((existingList.data as { items?: { catalog_id?: number | null }[] }).items ?? []);
  const usedCatalogIds = new Set(
    existingRows.map((r) => r.catalog_id).filter((id): id is number => typeof id === 'number')
  );
  const freeCatalog = catalogItems.find((c: { id: number }) => !usedCatalogIds.has(c.id));

  if (freeCatalog) {
    const created = await jsonApi('POST', '/api/equipment', {
      catalog_id: freeCatalog.id,
      quantity: 1,
      status: 'operational',
    });
    ok(
      '#16 Registrar desde catálogo',
      created.res.status === 201 && Boolean((created.data as { id?: number }).id),
      `status=${created.res.status}`
    );

    const equipmentId = (created.data as { id?: number }).id;

    const dup = await jsonApi('POST', '/api/equipment', {
      catalog_id: freeCatalog.id,
      quantity: 1,
      status: 'operational',
    });
    ok(
      '#18 Sin duplicados misma máquina',
      dup.res.status === 409,
      `status=${dup.res.status} body=${JSON.stringify(dup.data).slice(0, 120)}`
    );

    if (equipmentId) {
      await jsonApi('DELETE', `/api/equipment/${equipmentId}`);
    }
  } else {
    // Fallback: custom-name uniqueness when every catalog type is already registered
    const customName = `QA-Equip-${Date.now()}`;
    const created = await jsonApi('POST', '/api/equipment', {
      custom_name: customName,
      quantity: 1,
      status: 'operational',
    });
    ok(
      '#16 Registrar desde catálogo (fallback custom)',
      created.res.status === 201 && Boolean((created.data as { id?: number }).id),
      `status=${created.res.status}`
    );
    const equipmentId = (created.data as { id?: number }).id;
    const dup = await jsonApi('POST', '/api/equipment', {
      custom_name: customName,
      quantity: 1,
      status: 'operational',
    });
    ok('#18 Sin duplicados misma máquina', dup.res.status === 409, `status=${dup.res.status}`);
    if (equipmentId) {
      await jsonApi('DELETE', `/api/equipment/${equipmentId}`);
    }
  }

  const before = await jsonApi('GET', '/api/settings/exchange-rate');
  ok('GET settings tasa', before.res.status === 200);

  const overrideRate = 777.77;
  const put = await jsonApi('PUT', '/api/settings/exchange-rate', {
    override_rate: overrideRate,
    override_note: 'QA UX-QA #17',
  });
  ok('#17 Override manual BCV', put.res.status === 200, `status=${put.res.status}`);

  const publicRate = await jsonApi('GET', '/api/exchange-rate');
  const rate = Number((publicRate.data as { rate?: number }).rate);
  ok(
    '#17 Tasa refleja override en pagos/API pública',
    publicRate.res.status === 200 && Math.abs(rate - overrideRate) < 0.001,
    `rate=${rate}`
  );

  await jsonApi('PUT', '/api/settings/exchange-rate', { clear_override: true });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
