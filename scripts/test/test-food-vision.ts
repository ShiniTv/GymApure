/**
 * Smoke test: GEMINI_API_KEY + POST /api/nutrition/analyze-food
 * Uso: tsx scripts/dev/run-with-env.ts .env.dev scripts/test/test-food-vision.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const MEMBER_EMAIL = 'member@gym.com';

function maskKey(key: string | undefined): string {
  if (!key?.trim()) return '(no definida)';
  const k = key.trim();
  if (k.length <= 8) return '***';
  return `${k.slice(0, 4)}…${k.slice(-4)} (${k.length} chars)`;
}

async function main() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  const provider = process.env.FOOD_VISION_PROVIDER?.trim() || '(auto)';
  console.log('FOOD_VISION_PROVIDER:', provider);
  console.log('GEMINI_API_KEY:', maskKey(key));
  console.log('OPENROUTER_API_KEY:', maskKey(orKey));
  if (!key && !orKey && provider !== 'mock' && process.env.NODE_ENV === 'production') {
    console.error('FAIL: sin proveedor de visión configurado');
    process.exit(1);
  }
  if (key && !key.startsWith('AIza') && provider === 'gemini') {
    console.warn(
      'WARN: las API keys de Google AI Studio suelen empezar por "AIza".'
    );
  }
  if (!DEMO_PASSWORD) {
    console.error('FAIL: DEMO_PASSWORD no definido');
    process.exit(1);
  }

  const health = await fetch(`${BASE}/api/health`);
  if (!health.ok) {
    console.error(`FAIL: servidor no responde en ${BASE} (¿npm run dev?)`);
    process.exit(1);
  }

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MEMBER_EMAIL, password: DEMO_PASSWORD }),
  });
  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  const tokenMatch = /token=([^;]+)/.exec(setCookie);
  const csrfMatch = /csrf_token=([^;]+)/.exec(setCookie);
  if (!loginRes.ok || !tokenMatch) {
    console.error('FAIL: login member', loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const cookie = `token=${tokenMatch[1]}${csrfMatch ? `; csrf_token=${csrfMatch[1]}` : ''}`;
  const csrf = csrfMatch?.[1] ?? '';

  const imagePath = path.resolve('public/logo-mark-light.jpg');
  if (!fs.existsSync(imagePath)) {
    console.error('FAIL: imagen de prueba no encontrada');
    process.exit(1);
  }
  const blob = new Blob([fs.readFileSync(imagePath)], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('photo', blob, 'meal-test.jpg');

  const analyzeRes = await fetch(`${BASE}/api/nutrition/analyze-food`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}),
    },
    body: form,
  });
  const bodyText = await analyzeRes.text();
  let data: unknown;
  try {
    data = JSON.parse(bodyText);
  } catch {
    data = bodyText;
  }

  console.log('analyze-food status:', analyzeRes.status);
  console.log('analyze-food body:', JSON.stringify(data, null, 2));

  if (analyzeRes.status === 200 && typeof data === 'object' && data && 'calories' in data) {
    console.log('\nOK: análisis por foto funcionando');
    process.exit(0);
  }
  if (analyzeRes.status === 503) {
    console.error('\nFAIL: servidor sin GEMINI_API_KEY cargada — reinicia npm run dev tras editar .env.dev');
    process.exit(1);
  }
  console.error('\nFAIL: análisis no devolvió macros válidos');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
