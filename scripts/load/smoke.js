/**
 * k6 smoke — login health + authenticated panel probe.
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost:3000 -e EMAIL=member@gym.com -e PASSWORD=... scripts/load/smoke.js
 *
 * CI nightly: .github/workflows/load-smoke.yml (manual + schedule).
 * Target: p95(http_req_duration) < 800ms for /api/health; login < 1500ms.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failRate = new Rate('client_errors');

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    client_errors: ['rate<0.05'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const health = http.get(`${BASE}/api/health/live`);
  const healthOk = check(health, {
    'live 200': (r) => r.status === 200,
  });
  failRate.add(!healthOk);

  const ready = http.get(`${BASE}/api/health/ready`);
  check(ready, {
    'ready 200 or 503': (r) => r.status === 200 || r.status === 503,
  });

  const email = __ENV.EMAIL;
  const password = __ENV.PASSWORD;
  if (email && password) {
    const login = http.post(
      `${BASE}/api/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const loginOk = check(login, {
      'login 200': (r) => r.status === 200,
    });
    failRate.add(!loginOk);
  }

  sleep(1);
}
