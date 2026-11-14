import { expect, test, type Page } from "@playwright/test";

import { ENV_PAYLOAD, SETTINGS_PAYLOAD } from "./helpers/fixtures";
import { collectContrastViolations } from "./helpers/contrast";
import { installVisualMocks, prepareVisualPage } from "./helpers/mock-api";

/**
 * The visual fixtures use kind data: short names, working icons, one source.
 * These checks keep the worst realistic values inside the layout: a long
 * household name, a failed icon, a one-letter disabled source, a collection
 * with missing members, and long share/template identifiers.
 */

const LONG_NAME =
  "Aleksandra Wiśniewska-Kowalczyk — Hong Kong Premium Streaming & AI Network (2026 Renewal)";
const LONG_TEMPLATE =
  "ACL4SSR Mihomo — Full Routing with Streaming, AI, Telegram, GitHub, and Fallback Groups";
const LONG_RESOURCE = "daily-long-name-with-a-very-long-resource-identifier-for-testing";

const ok = (data: unknown) => ({ status: "success" as const, data });
const json = (data: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(data),
});

const sources = [
  {
    id: "long-name-source",
    name: LONG_NAME,
    type: "remote",
    url: "https://example.com/sub/long-name-source",
    content: "",
    filters: [],
    enabled: true,
    meta: { tag: ["hong-kong-premium", "reality", "backup"], icon: "https://broken.invalid/icon.png" },
  },
  {
    id: "a",
    name: "A",
    type: "local",
    url: "",
    content: "",
    filters: [],
    enabled: false,
    meta: { tag: [] },
  },
];

const collections = [
  {
    id: "daily-long",
    name: "Daily Mix — All Regions, Streaming, AI, Telegram, GitHub, and Fallback",
    sourceIds: ["long-name-source", "a", "deleted-source"],
    filters: [],
    templateId: "acl4ssr-mihomo",
    ignoreFailed: true,
    enabled: true,
    meta: { tag: ["mix"] },
  },
];

async function installWorstCase(page: Page, options?: { longRows?: boolean }) {
  await installVisualMocks(page, "populated");
  // Deterministic image failure: no DNS wait, the @error handler fires at once.
  await page.route("https://broken.invalid/**", (route) => route.abort());
  const env = { ...ENV_PAYLOAD, app: "Sub-Store Cloudflare — Aleksandra's Self-Hosted Subscription Pipeline" };
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill(json(ok({ env, settings: SETTINGS_PAYLOAD, sources, collections }))),
  );
  await page.route("**/api/settings", (route) => route.fulfill(json(ok(SETTINGS_PAYLOAD))));
  await page.route("**/api/sources", (route) => route.fulfill(json(ok(sources))));
  await page.route("**/api/collections", (route) => route.fulfill(json(ok(collections))));
  await page.route("**/api/source/flow/**", (route) =>
    route.fulfill(json(ok({
      planName: "Premium 10 TB Annual Plan",
      total: 10 * 1024 ** 4,
      usage: { upload: 9.9 * 1024 ** 4, download: 0.09 * 1024 ** 4 },
      expires: 4102444800,
      remainingDays: 9999,
    }))),
  );

  if (options?.longRows) {
    await page.route("**/api/templates", (route) =>
      route.fulfill(json(ok([
        { id: "long-template", name: LONG_TEMPLATE, target: "mihomo", config: {}, readonly: true },
      ]))),
    );
    await page.route("**/api/shares", (route) =>
      route.fulfill(json(ok([
        { id: "share-long", resourceType: "collection", resourceId: LONG_RESOURCE, target: "mihomo", enabled: true, expiresAt: "2099-12-31T23:59:59.000Z" },
      ]))),
    );
    await page.route("**/api/recycle-bin", (route) =>
      route.fulfill(json(ok([
        { id: "recycle-long", resourceType: "source", resourceId: LONG_RESOURCE, name: "A very long deleted source name that should still be readable somewhere", deletedAt: "2026-11-01T08:30:00.000Z" },
      ]))),
    );
  }
}

test("long names and failed icons keep the card intact", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await prepareVisualPage(page);
  await installWorstCase(page);
  await page.goto("/subs", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sub-item-wrapper").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".sub-item-wrapper").first().locator(".app-avatar__fallback")).toBeVisible({ timeout: 5_000 });

  const wide = await page.evaluate(() => {
    const card = document.querySelector(".sub-item-wrapper")!;
    const detail = card.querySelector(".sub-item-detail-isSimple") as HTMLElement | null;
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      brokenImage: Boolean(card.querySelector(".app-avatar__image")),
      fallbackIcon: Boolean(card.querySelector(".app-avatar__fallback")),
      nameTitle: card.querySelector(".sub-item-name")?.getAttribute("title"),
      detailTitle: detail?.getAttribute("title") || "",
    };
  });
  expect(wide.overflowX).toBe(0);
  // A failed URL must remove the <img>, not paint the browser's broken glyph.
  expect(wide.brokenImage).toBe(false);
  expect(wide.fallbackIcon).toBe(true);
  expect(wide.nameTitle).toBe(LONG_NAME);
  expect(wide.detailTitle).toContain("9.99 TB");

  // 200% zoom of a 1280px window lands near 640 CSS px.
  await page.setViewportSize({ width: 640, height: 800 });
  await page.waitForTimeout(200);
  const zoomed = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    actionsInside: [...document.querySelectorAll<HTMLElement>(".sub-item-wrapper")].every((card) => {
      const menu = card.querySelector<HTMLElement>(".sub-item-menu");
      return !menu || menu.getBoundingClientRect().right <= card.getBoundingClientRect().right;
    }),
  }));
  expect(zoomed.overflowX).toBe(0);
  expect(zoomed.actionsInside).toBe(true);

  await page.setViewportSize({ width: 320, height: 780 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>(".sub-item-wrapper")];
    const hero = document.querySelector(".home-hero")!.getBoundingClientRect();
    const copyLabel = cards[0].querySelector<HTMLElement>(".sub-item-action__label");
    const disabledBadge = cards[1].querySelector<HTMLElement>(".sub-item-state");
    const targets = [...document.querySelectorAll<HTMLElement>(".flow-target")];
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      copyLabelHidden: !copyLabel || getComputedStyle(copyLabel).display === "none",
      disabledBadgeHidden: !disabledBadge || disabledBadge.offsetParent === null,
      targetsInsideHero: targets.every((target) => {
        const box = target.getBoundingClientRect();
        return box.left >= hero.left && box.right <= hero.right;
      }),
    };
  });
  expect(narrow.overflowX).toBe(0);
  expect(narrow.copyLabelHidden).toBe(true);
  expect(narrow.disabledBadgeHidden).toBe(true);
  expect(narrow.targetsInsideHero).toBe(true);
});

test("worst case stays readable in dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await prepareVisualPage(page);
  await installWorstCase(page);
  await page.goto("/subs", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sub-item-wrapper").first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  expect(await page.evaluate(collectContrastViolations)).toEqual([]);
});

test("long list rows keep their full value on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareVisualPage(page);
  await installWorstCase(page, { longRows: true });

  await page.goto("/my", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".my-page-wrapper .list-row__title").first()).toBeVisible({ timeout: 10_000 });
  const template = await page.evaluate(() => ({
    title: document.querySelector(".list-row__title")?.getAttribute("title"),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(template.title).toBe(LONG_TEMPLATE);
  expect(template.overflowX).toBe(0);

  await page.goto("/tools", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".tools-page .list-row__title").first()).toBeVisible({ timeout: 10_000 });
  const rows = await page.evaluate(() => ({
    titles: [...document.querySelectorAll<HTMLElement>(".tools-page .list-row__title")].map((el) => el.getAttribute("title")),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(rows.titles).toContain(`组合/${LONG_RESOURCE}`);
  expect(rows.titles).toContain(`订阅源/${LONG_RESOURCE}`);
  expect(rows.overflowX).toBe(0);
});
