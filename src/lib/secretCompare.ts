import crypto from 'crypto';
import { env } from '../config/env.ts';

export function secretsMatch(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isValidCronSecret(headerSecret: string | null): boolean {
  const cronSecret = env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  return secretsMatch(headerSecret, cronSecret);
}
