import { expect, test, type Page } from '@playwright/test';
import { installVisualMocks, prepareVisualPage } from './helpers/mock-api';

/**
 * WCAG 2.5.8 asks for a 24×24 CSS-pixel target. The section toggle used to be
 * 21px tall, which a thumb misses on a phone.
 */

const collectSmallTargets = () => {
  const small: string[] = [];
  document
    .querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="menuitem"]')
    .forEach((element) => {
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      if (Number.parseFloat(style.opacity) < 0.4) return;
      const box = element.getBoundingClientRect();
      /* A 1px box is a hidden proxy (the file input behind a real button),
         not something a finger is meant to hit. */
      if (box.width <= 1 || box.height <= 1) return;
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      if (box.width >= 24 && box.height >= 24) return;
      const label = element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 20) || element.tagName;
      small.push(`${Math.round(box.width)}x${Math.round(box.height)} ${element.tagName.toLowerCase()} "${label}"`);
    });
  return small;
};

async function auditPage(page: Page) {
  const found = new Set<string>();
  for (const position of ['top', 'bottom']) {
    await page.evaluate((target) => {
      window.scrollTo(0, target === 'top' ? 0 : document.body.scrollHeight);
    }, position);
    await page.waitForTimeout(300);
    for (const item of await page.evaluate(collectSmallTargets)) found.add(item);
  }
  return [...found];
}

for (const path of ['/subs', '/tools', '/my']) {
  test(`${path} keeps every control at least 24px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareVisualPage(page);
    await installVisualMocks(page, 'populated');
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.nav-bar-wrapper')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(600);
    expect(await auditPage(page)).toEqual([]);
  });
}
