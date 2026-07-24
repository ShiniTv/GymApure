import { test } from '@playwright/test';
import { assertLoginAdaptive } from './auth-login-adaptive.shared';

test.describe('Login adaptativo (tablet)', () => {
  test('card ancha + a11y password', async ({ page }, testInfo) => {
    await assertLoginAdaptive(page, testInfo.project.name);
  });
});
