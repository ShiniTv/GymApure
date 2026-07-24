import { test } from '@playwright/test';
import { assertLoginAdaptive } from './auth-login-adaptive.shared';

test.describe('Login adaptativo (desktop)', () => {
  test('layout centrado + a11y password', async ({ page }, testInfo) => {
    await assertLoginAdaptive(page, testInfo.project.name);
  });
});
