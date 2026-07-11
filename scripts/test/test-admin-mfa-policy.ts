import { adminMustEnableMfaBeforeLogin } from '../../src/lib/adminMfaPolicy.ts';

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

ok('dev: admin sin MFA puede intentar login', !adminMustEnableMfaBeforeLogin(false, 'development'));
ok('dev: admin con MFA ok', !adminMustEnableMfaBeforeLogin(true, 'development'));
ok('prod: admin sin MFA bloqueado', adminMustEnableMfaBeforeLogin(false, 'production'));
ok('prod: admin con MFA permitido', !adminMustEnableMfaBeforeLogin(true, 'production'));

console.log(`\n=== MFA policy: ${passed} OK, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
