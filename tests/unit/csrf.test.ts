import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.ts', () => ({
  env: { NODE_ENV: 'test', PUBLIC_APP_URL: 'http://localhost:3000' },
}));

import {
  clearCsrfCookie,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  setCsrfCookie,
  tokensMatch,
} from '../../src/lib/csrf.ts';

describe('csrf helpers', () => {
  it('generates unpredictable-looking 256-bit hex tokens', () => {
    const first = generateCsrfToken();
    const second = generateCsrfToken();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });

  it('compares only non-empty strings of equal length', () => {
    expect(tokensMatch('same-token', 'same-token')).toBe(true);
    expect(tokensMatch('same-token', 'other-token')).toBe(false);
    expect(tokensMatch('short', 'longer')).toBe(false);
    expect(tokensMatch('', '')).toBe(false);
    expect(tokensMatch(null, 'token')).toBe(false);
  });

  it('sets and clears the expected cookie', () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    expect(setCsrfCookie(res as never, 'fixed-token')).toBe('fixed-token');
    expect(res.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      'fixed-token',
      expect.objectContaining({ httpOnly: false, sameSite: 'lax', path: '/' })
    );
    clearCsrfCookie(res as never);
    expect(res.clearCookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      expect.objectContaining({ sameSite: 'lax', path: '/' })
    );
  });
});
