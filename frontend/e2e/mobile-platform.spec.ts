import { expect, test, type Page } from "@playwright/test";

import { installVisualMocks, prepareVisualPage } from "./helpers/mock-api";

/**
 * Platform-level behaviour a phone browser relies on. These do not show up in a
 * desktop screenshot, and each one is a single declaration someone could drop
 * while restyling a form or the theme hook.
 */

const MOBILE = { width: 390, height: 844 };

const open = async (page: Page, path: string, ready: string, dark = false) => {
  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light", reducedMotion: "reduce" });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(300);
};

const fieldSizes = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("input, select, textarea")]
      .filter((el) => {
        const type = (el as HTMLInputElement).type;
        if (["checkbox", "radio", "file", "hidden"].includes(type)) return false;
        const box = el.getBoundingClientRect();
        return box.width > 1 && box.height > 1;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className} ${getComputedStyle(el).fontSize}`),
  );

/* iOS zooms into any field under 16px and never zooms back out, which is why
   zooming used to be disabled in the viewport instead. */
test.describe("touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: MOBILE });

  for (const [path, ready] of [
    ["/my", ".my-page-wrapper"],
    ["/edit/subs/UNTITLED", ".page-wrapper"],
  ] as const) {
    test(`${path} sizes every field at 16px on a phone`, async ({ page }) => {
      await open(page, path, ready);
      const undersized = (await fieldSizes(page)).filter((entry) => !entry.endsWith("16px"));
      expect(undersized).toEqual([]);
    });
  }
});

/* The status bar takes its colour from theme-color. Before boot it follows the
   OS scheme; after boot it has to follow the theme the account picked. */
test.describe("browser chrome", () => {
  const themeColors = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => meta.getAttribute("content")),
    );

  test("follows the light theme", async ({ page }) => {
    await open(page, "/subs", ".sub-item-wrapper");
    expect(await themeColors(page)).toEqual(["#F4F6F3", "#F4F6F3"]);
  });

  test("follows the dark theme", async ({ page }) => {
    await open(page, "/subs", ".sub-item-wrapper", true);
    expect(await themeColors(page)).toEqual(["#0A0E0C", "#0A0E0C"]);
  });
});
