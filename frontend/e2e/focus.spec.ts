import { expect, test } from '@playwright/test';
import { installVisualMocks, prepareVisualPage } from './helpers/mock-api';

/**
 * The current tab paints its own card shadow, which used to replace the
 * keyboard focus ring entirely — tabbing onto 订阅 showed no indicator at all.
 */
test('the current tab keeps its focus ring', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await prepareVisualPage(page);
  await installVisualMocks(page, 'populated');
  await page.goto('/subs', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sub-item-wrapper').first()).toBeVisible({ timeout: 10_000 });

  const activeTab = page.locator('.nav-segmented-item.is-active');
  const before = await activeTab.evaluate((element) => getComputedStyle(element).boxShadow);

  // skip link -> brand -> the tab for the current page
  for (let press = 0; press < 5 && !(await activeTab.evaluate((el) => el === document.activeElement)); press += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(activeTab).toBeFocused();
  await page.waitForTimeout(400);

  const after = await activeTab.evaluate((element) => ({
    shadow: getComputedStyle(element).boxShadow,
    focusVisible: element.matches(':focus-visible'),
  }));
  expect(after.focusVisible).toBe(true);
  expect(after.shadow).not.toBe(before);
});
