import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

async function pullToRefresh(page: import('@playwright/test').Page) {
  await page.evaluate(() => { window.scrollTo(0, 0); });
  const host = page.locator('.page-stack-tight').locator('xpath=..');

  const box = await host.boundingBox();
  if (!box) throw new Error('PTR host not found');

  const x = box.x + box.width / 2;
  const startY = box.y + 8;
  const endY = startY + 220;

  await page.touchscreen.tap(x, startY);
  await page.evaluate(
    ({ x, startY, endY }) => {
      const inner = document.querySelector('.page-stack-tight');
      const el = inner?.parentElement;
      if (!el) return;
      const touch = (y: number) =>
        new Touch({ identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y });
      el.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch(startY)] })
      );
      el.dispatchEvent(
        new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch(endY)] })
      );
    },
    { x, startY, endY }
  );
  await page.waitForTimeout(80);
  await page.evaluate(
    ({ x, endY }) => {
      const inner = document.querySelector('.page-stack-tight');
      const el = inner?.parentElement;
      if (!el) return;
      const touch = new Touch({ identifier: 1, target: el, clientX: x, clientY: endY, pageX: x, pageY: endY });
      el.dispatchEvent(
        new TouchEvent('touchend', { bubbles: true, cancelable: true, changedTouches: [touch] })
      );
    },
    { x, endY }
  );
}

test.describe('Member pull-to-refresh', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('PTR en rutinas muestra indicador Actualizando', async ({ page }) => {
    await page.goto('/routines');
    await page.waitForFunction(() => !document.body.textContent?.includes('Cargando rutinas'), undefined, {
      timeout: 20_000,
    });

    await pullToRefresh(page);
    await expect(page.getByText('Actualizando…')).toBeVisible({ timeout: 10_000 });
  });
});
