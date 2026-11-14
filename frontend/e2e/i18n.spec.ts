import { expect, test } from "@playwright/test";

import { installVisualMocks, prepareVisualPage } from "./helpers/mock-api";

test("loads the inactive locale on demand", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");

  const localeChunks: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/\/assets\/chunks\/(zh|en)-/.test(url)) localeChunks.push(url);
  });

  await page.goto("/subs", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sub-item-wrapper").first()).toBeVisible({ timeout: 10_000 });
  expect(localeChunks.some((url) => url.includes("/zh-"))).toBe(true);
  expect(localeChunks.some((url) => url.includes("/en-"))).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  await page.locator('[aria-label="轻点语言以切换"]').click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 10_000 });
  expect(localeChunks.some((url) => url.includes("/en-"))).toBe(true);
  await expect(page.locator('[aria-label="Tap a language to switch"]')).toBeVisible();

  await page.locator('[aria-label="Tap a language to switch"]').click();
  await page.getByRole("menuitem", { name: "简体中文" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN", { timeout: 10_000 });
});
