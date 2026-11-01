import { expect, test, type Page } from "@playwright/test";

import { installVisualMocks, prepareVisualPage } from "./helpers/mock-api";
import type { VisualScenario } from "./helpers/fixtures";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

const screenshot = async (page: Page, name: string) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
};

const openReady = async (
  page: Page,
  path: string,
  scenario: VisualScenario,
  ready: string,
  options?: { token?: string | null; colorScheme?: "light" | "dark"; viewport?: { width: number; height: number } },
) => {
  await page.setViewportSize(options?.viewport ?? DESKTOP);
  await page.emulateMedia({
    colorScheme: options?.colorScheme ?? "light",
    reducedMotion: "reduce",
  });
  await prepareVisualPage(page, { token: options?.token });
  await installVisualMocks(page, scenario);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 10_000 });
};

test.describe("visual snapshots", () => {
  test("subs populated desktop light", async ({ page }) => {
    await openReady(page, "/subs", "populated", ".sub-item-wrapper");
    await screenshot(page, "subs-populated-desktop-light");
  });

  test("subs populated desktop dark", async ({ page }) => {
    await openReady(page, "/subs", "populated", ".sub-item-wrapper", { colorScheme: "dark" });
    await screenshot(page, "subs-populated-desktop-dark");
  });

  test("subs populated mobile light", async ({ page }) => {
    await openReady(page, "/subs", "populated", ".sub-item-wrapper", { viewport: MOBILE });
    await screenshot(page, "subs-populated-mobile-light");
  });

  test("subs empty desktop light", async ({ page }) => {
    await openReady(page, "/subs", "empty", ".onboarding-empty");
    await screenshot(page, "subs-empty-desktop-light");
  });

  test("auth gate desktop light", async ({ page }) => {
    await openReady(page, "/subs", "unauthorized", ".admin-token-panel", { token: null });
    await screenshot(page, "auth-gate-desktop-light");
  });

  test("tools populated desktop light", async ({ page }) => {
    await openReady(page, "/tools", "populated", ".tools-page");
    await expect(page.locator(".feature-card").first()).toBeVisible();
    await screenshot(page, "tools-populated-desktop-light");
  });

  test("tools populated mobile light", async ({ page }) => {
    await openReady(page, "/tools", "populated", ".tools-page", { viewport: MOBILE });
    await expect(page.locator(".feature-card").first()).toBeVisible();
    await screenshot(page, "tools-populated-mobile-light");
  });

  test("settings populated desktop light", async ({ page }) => {
    await openReady(page, "/my", "populated", ".my-page-wrapper");
    await expect(page.locator(".template-card").first()).toBeVisible();
    await screenshot(page, "settings-populated-desktop-light");
  });

  test("settings populated mobile light", async ({ page }) => {
    await openReady(page, "/my", "populated", ".my-page-wrapper", { viewport: MOBILE });
    await expect(page.locator(".template-card").first()).toBeVisible();
    await screenshot(page, "settings-populated-mobile-light");
  });

  test("editor new source desktop light", async ({ page }) => {
    await openReady(page, "/edit/subs/UNTITLED", "populated", ".page-wrapper");
    await expect(page.locator(".app-form-item input").first()).toBeVisible();
    await screenshot(page, "editor-new-source-desktop-light");
  });

  test("copy modal desktop light", async ({ page }) => {
    await openReady(page, "/subs", "populated", ".sub-item-wrapper");
    await page.locator(".sub-item-name").first().click();
    await expect(page.locator(".preview-panel-title").locator("visible=true")).toBeVisible();
    await screenshot(page, "copy-modal-desktop-light");
  });

  test("copy sheet mobile light", async ({ page }) => {
    await openReady(page, "/subs", "populated", ".sub-item-wrapper", { viewport: MOBILE });
    await page.locator(".sub-item-name").first().click();
    await expect(page.locator(".preview-panel-title").locator("visible=true")).toBeVisible();
    await screenshot(page, "copy-sheet-mobile-light");
  });
});
