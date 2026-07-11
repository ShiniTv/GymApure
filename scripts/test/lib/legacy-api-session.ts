/**
 * Sesión API compatible con scripts legacy (sprint tests, etc.).
 * Delega en TestApiClient para cookie + CSRF.
 */
import { TestApiClient } from './test-api-client.ts';

export function createApiSession(baseUrl?: string) {
  const client = new TestApiClient(baseUrl);
  const demoPassword = process.env.DEMO_PASSWORD ?? '';

  async function api(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ) {
    const result = await client.json(method, path, body, { extraHeaders });
    return { res: result.res, data: result.data };
  }

  async function formPost(path: string, form: FormData) {
    const result = await client.formPost(path, form);
    return { res: result.res, data: result.data };
  }

  async function textGet(path: string) {
    const headers: Record<string, string> = {};
    const cookie = client.cookieHeader;
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(`${client.baseUrl}${path}`, { headers });
    const text = await res.text();
    return { res, text };
  }

  async function loginAs(email: string, password = demoPassword) {
    client.clearSession();
    const login = await client.login(email, password);
    return login.status === 200;
  }

  function clearSession() {
    client.clearSession();
  }

  return { client, api, formPost, textGet, loginAs, clearSession };
}
