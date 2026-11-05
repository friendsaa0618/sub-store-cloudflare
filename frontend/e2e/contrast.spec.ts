import { expect, test, type Page } from '@playwright/test';
import { collectContrastViolations } from './helpers/contrast';
import { ENV_PAYLOAD, POPULATED_COLLECTIONS, POPULATED_SOURCES, SETTINGS_PAYLOAD } from './helpers/fixtures';
import { installVisualMocks, prepareVisualPage } from './helpers/mock-api';

/**
 * Text that falls under WCAG AA is a regression we have shipped before (an
 * accent colour used as 12px text), so the pages with the densest small text
 * are checked in both themes.
 */

type Theme = 'dark' | 'light';

const NODE = { id: 'n1', type: 'ss', name: 'HK-01', server: '1.1.1.1', port: 443 };
const FILTERED_NODE = { id: 'n2', type: 'ss', name: 'US-02', server: '2.2.2.2', port: 443 };

const settingsFor = (theme: Theme) => ({
  ...SETTINGS_PAYLOAD,
  theme: { auto: false, name: theme, dark: 'dark', light: 'light' },
});

async function openThemed(page: Page, path: string, theme: Theme) {
  const settings = settingsFor(theme);
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareVisualPage(page);
  await installVisualMocks(page, 'populated');
  await page.route('**/api/settings', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: settings }),
    }),
  );
  await page.route('**/api/bootstrap', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          env: ENV_PAYLOAD,
          settings,
          sources: POPULATED_SOURCES,
          collections: POPULATED_COLLECTIONS,
        },
      }),
    }),
  );
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.nav-bar-wrapper')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);
}

for (const theme of ['dark', 'light'] as const) {
  for (const [path, name] of [
    ['/subs', 'list'],
    ['/tools', 'tools'],
    ['/my', 'settings'],
  ] as const) {
    test(`${name} text meets AA contrast in the ${theme} theme`, async ({ page }) => {
      await openThemed(page, path, theme);
      expect(await page.evaluate(collectContrastViolations)).toEqual([]);
    });
  }

  test(`compare view text meets AA contrast in the ${theme} theme`, async ({ page }) => {
    await openThemed(page, '/subs', theme);
    await page.route('**/api/preview/source', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            processed: [NODE],
            original: [NODE, FILTERED_NODE],
            filtered: [FILTERED_NODE],
            renamed: [],
          },
        }),
      }),
    );
    await page.locator('.sub-img-wrappers').first().click();
    await expect(page.locator('.compare-page-wrapper')).toBeVisible();
    await page.waitForTimeout(800);
    expect(await page.evaluate(collectContrastViolations)).toEqual([]);
  });
}
