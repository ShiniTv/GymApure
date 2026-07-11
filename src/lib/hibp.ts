import crypto from 'crypto';

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const REQUEST_TIMEOUT_MS = 4_000;

class HibpCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HibpCheckError';
  }
}

function sha1Hex(value: string): string {
  return crypto.createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

/**
 * k-anonymity check against Have I Been Pwned (optional).
 * Returns true if password appears in breach corpus.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  const hash = sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) {
      throw new HibpCheckError(`HIBP respondió HTTP ${res.status}`);
    }

    const body = await res.text();
    return body.split('\n').some((line) => {
      const [hashSuffix] = line.split(':');
      return hashSuffix?.trim() === suffix;
    });
  } catch (err) {
    if (err instanceof HibpCheckError) throw err;
    throw new HibpCheckError('No se pudo contactar Have I Been Pwned');
  } finally {
    clearTimeout(timeout);
  }
}
