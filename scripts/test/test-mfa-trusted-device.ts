/**
 * Trusted MFA device: issue + verify (memory fallback when Redis off).
 * No server required.
 */
import type { Response } from 'express';
import {
  issueTrustedMfaDevice,
  isTrustedMfaDevice,
  MFA_TRUSTED_COOKIE,
} from '../../src/lib/mfaTrustedDevice.ts';

function mockRes() {
  const jar: Record<string, string> = {};
  const res = {
    cookie(name: string, value: string) {
      jar[name] = value;
    },
    clearCookie(name: string) {
      delete jar[name];
    },
  } as unknown as Response;
  return { res, jar };
}

async function main() {
  const userId = 4242;
  const { res, jar } = mockRes();

  await issueTrustedMfaDevice(res, userId);
  const token = jar[MFA_TRUSTED_COOKIE];
  if (!token || token.length < 32) {
    console.error('FAIL: cookie mfa_device no emitida');
    process.exit(1);
  }

  const ok = await isTrustedMfaDevice(userId, token);
  const other = await isTrustedMfaDevice(userId, 'not-a-real-token-xxxxxxxxxxxx');
  const otherUser = await isTrustedMfaDevice(userId + 1, token);

  if (ok && !other && !otherUser) {
    console.log('PASS: trusted device issue + verify (+ rechazo token/usuario ajeno)');
    process.exit(0);
  }

  console.error('FAIL:', { ok, other, otherUser });
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
