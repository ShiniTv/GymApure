/**
 * Unit checks for safeReturnPath (no server).
 */
import { safeReturnPath } from '../../src/lib/safeReturnPath.ts';

let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  OK  ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

const role = 'member' as const;
const home = '/panel';

assert('fallback null', safeReturnPath(null, role) === home);
assert('ok relative', safeReturnPath('/payments?register=1', role) === '/payments?register=1');
assert('ok object', safeReturnPath({ pathname: '/routines', search: '?x=1' }, role) === '/routines?x=1');
assert('reject //', safeReturnPath('//evil.com', role) === home);
assert('reject ://', safeReturnPath('/go://evil', role) === home);
assert('reject backslash', safeReturnPath('/\\evil.com', role) === home);
assert('reject login', safeReturnPath('/login', role) === home);
assert('reject login query', safeReturnPath('/login?next=/panel', role) === home);
assert('reject encoded //', safeReturnPath('/%2f%2fevil.com', role) === home);
assert('reject ..', safeReturnPath('/foo/../bar', role) === home);
assert('reject absolute url', safeReturnPath('https://evil.com', role) === home);

console.log(failed === 0 ? '\nsafeReturnPath OK' : `\n${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
