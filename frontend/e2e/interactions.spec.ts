import { expect, test, type Page } from "@playwright/test";

import { installVisualMocks, prepareVisualPage } from "./helpers/mock-api";
import { ENV_PAYLOAD, SETTINGS_PAYLOAD } from "./helpers/fixtures";

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

test("local source editor fills the card", async ({ page }) => {
  await open(page, "/edit/subs/UNTITLED", ".page-wrapper");
  // Second radio in the source switch is the local source.
  await page.locator(".radio-wrapper .app-radio").nth(1).click();
  const editor = page.locator(".cmviewRef").first();
  await expect(editor).toBeVisible();

  const editorBox = await editor.boundingBox();
  const toolbarBox = await page.locator(".local-content-toolbar").boundingBox();
  // The editor row has no label, so it owns the card width; a label column
  // would squeeze it to ~96px and wrap every toolbar button onto its own line.
  expect(editorBox!.width).toBeGreaterThan(700);
  expect(toolbarBox!.height).toBeLessThan(40);
});

test("code editor toolbar stays on one row at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  await page.goto("/edit/subs/UNTITLED", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".page-wrapper").first()).toBeVisible();
  await page.locator(".radio-wrapper .app-radio").nth(1).click();
  await expect(page.locator(".cmviewRef").first()).toBeVisible();

  // The action strip used to wrap, dropping the last icon onto a second row.
  const rows = await page.$$eval(".cm-img-button button", (buttons) =>
    [...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))],
  );
  expect(rows).toHaveLength(1);
});

test("action row keeps its name on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  await page.goto("/edit/subs/UNTITLED", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".page-wrapper").first()).toBeVisible();
  await page.locator(".action-tile").nth(1).click();
  await expect(page.locator(".list-group-item")).toBeVisible();

  // Seven controls used to squeeze the action name down to "节点...".
  const nameBox = await page.locator(".list-group-item .input-wrapper").first().boundingBox();
  expect(nameBox!.width).toBeGreaterThan(120);
});

test("card name survives a long tag run", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  const source = {
    id: "many-tags",
    name: "many-tags",
    type: "local",
    source: "local",
    url: "",
    content: "",
    filters: [],
    enabled: true,
    meta: { tag: ["united-states", "oregon", "aws", "reality", "primary", "backup"] },
  };
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { env: ENV_PAYLOAD, settings: SETTINGS_PAYLOAD, sources: [source], collections: [] },
      }),
    }),
  );
  await page.goto("/subs", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sub-item-name").first()).toBeVisible();

  // Tags used to shrink the name to 0px and run under the action buttons.
  const nameBox = await page.locator(".sub-item-name").first().boundingBox();
  const tagsBox = await page.locator(".sub-item-tags").first().boundingBox();
  const titleBox = await page.locator(".sub-item-title").first().boundingBox();
  expect(nameBox!.width).toBeGreaterThan(40);
  expect(tagsBox!.width).toBeLessThan(titleBox!.width * 0.6);
});

