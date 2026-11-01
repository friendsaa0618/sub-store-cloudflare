import { expect, test, type Page } from "@playwright/test";

import { installVisualMocks, prepareVisualPage } from "./helpers/mock-api";

const open = async (page: Page, path: string, ready: string) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 10_000 });
};

test("subs fold toggles", async ({ page }) => {
  await open(page, "/subs", ".sub-item-wrapper");
  await expect(page.locator(".sub-item-wrapper")).toHaveCount(2);
  await page.locator(".section-head__toggle").first().click();
  await expect(page.locator(".sub-item-wrapper")).toHaveCount(1);
  await page.locator(".section-head__toggle").first().click();
  await expect(page.locator(".sub-item-wrapper")).toHaveCount(2);
});

test("settings request form expands", async ({ page }) => {
  await open(page, "/my", ".profile-block");
  const head = page.locator(".section-head--clickable");
  await expect(page.locator(".settings-form-grid")).toHaveCount(0);
  await head.click();
  await expect(page.locator(".settings-form-grid")).toBeVisible();
  await expect(page.locator(".settings-form-grid input").first()).toBeVisible();
  await head.click();
  await expect(page.locator(".settings-form-grid")).toHaveCount(0);
});

