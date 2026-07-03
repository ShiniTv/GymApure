/**
 * Smoke test: direct Supabase video upload + signed playback on production.
 * Usage: SMOKE_BASE_URL=https://caribean-gym.onrender.com npx tsx scripts/_archive/test-prod-video-smoke.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') ?? 'https://caribean-gym.onrender.com';
const email = process.env.SMOKE_TRAINER_EMAIL ?? 'trainer@gym.com';
const password = process.env.DEMO_PASSWORD ?? process.env.SMOKE_PASSWORD;
const videoPath = process.env.SMOKE_VIDEO_PATH ?? resolve('tmp-test-video.mp4');

if (!password) {
  console.error('Set DEMO_PASSWORD or SMOKE_PASSWORD');
  process.exit(1);
}
if (!existsSync(videoPath)) {
  console.error(`Video not found: ${videoPath}`);
  process.exit(1);
}

const jar = new Map<string, string>();

function storeCookies(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const part = line.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookies = cookieHeader();
  if (cookies) headers.set('Cookie', cookies);
  const res = await fetch(`${base}${path}`, { ...init, headers });
  storeCookies(res);
  return res;
}

async function main() {
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const login = (await loginRes.json()) as { user: { role: string } };
  console.log('Login OK:', login.user.role);

  const capsRes = await api('/api/exercises/media-capabilities');
  const caps = (await capsRes.json()) as { directUpload: boolean; track: string };
  console.log('Capabilities:', caps);
  if (!caps.directUpload) {
    console.error('directUpload is false — aborting');
    process.exit(1);
  }

  const bytes = readFileSync(videoPath);
  const sessionRes = await api('/api/exercises/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: 'video/mp4', fileSize: bytes.length }),
  });
  if (!sessionRes.ok) {
    console.error('upload-url failed', sessionRes.status, await sessionRes.text());
    process.exit(1);
  }
  const session = (await sessionRes.json()) as {
    uploadUrl: string;
    token: string;
    videoRef: string;
  };
  console.log('Upload session ref:', session.videoRef);

  const putHeaders: Record<string, string> = { 'Content-Type': 'video/mp4' };
  if (session.token) putHeaders.Authorization = `Bearer ${session.token}`;
  const putRes = await fetch(session.uploadUrl, { method: 'PUT', headers: putHeaders, body: bytes });
  if (!putRes.ok) {
    console.error('Supabase PUT failed', putRes.status, await putRes.text());
    process.exit(1);
  }
  console.log('Supabase PUT OK');

  const form = new FormData();
  form.set('name', `Video smoke ${Date.now()}`);
  form.set('muscle_group', 'Pecho');
  form.set('description', 'Automated smoke test');
  form.set('execution', 'Test');
  form.set('video_storage_ref', session.videoRef);

  const createRes = await api('/api/exercises', { method: 'POST', body: form });
  if (!createRes.ok) {
    console.error('Create exercise failed', createRes.status, await createRes.text());
    process.exit(1);
  }
  const created = (await createRes.json()) as { id: number };
  console.log('Exercise created id:', created.id);

  const signedRes = await api(
    `/api/files/videos/signed-url?ref=${encodeURIComponent(session.videoRef)}`
  );
  if (!signedRes.ok) {
    console.error('signed-url failed', signedRes.status, await signedRes.text());
    process.exit(1);
  }
  const signed = (await signedRes.json()) as { url: string; expiresIn: number };
  console.log('Signed URL expires in', signed.expiresIn, 's');

  const headRes = await fetch(signed.url, { method: 'HEAD' });
  console.log('Playback HEAD:', headRes.status, headRes.headers.get('content-type'));
  if (!headRes.ok) {
    process.exit(1);
  }
  console.log('PASS: prod video upload + signed playback');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
