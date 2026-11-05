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
  /* The appearance section always shows a grid; this one belongs to the request form. */
  const requestCard = page.locator(".section-head--clickable + .settings-form-card");
  await expect(requestCard).toHaveCount(0);
  await head.click();
  await expect(requestCard).toBeVisible();
  await expect(requestCard.locator("input").first()).toBeVisible();
  await head.click();
  await expect(requestCard).toHaveCount(0);
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


test("a source can be disabled and enabled again", async ({ page }) => {
  await open(page, "/subs", ".sub-item-wrapper");
  let enabled = true;
  const bodies: unknown[] = [];
  await page.route("**/api/sources/hk-nodes", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      bodies.push(body);
      enabled = body.enabled;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: "hk-nodes",
          name: "HK Nodes",
          type: "local",
          url: "",
          content: "",
          filters: [],
          enabled,
          meta: { tag: ["hk"], icon: "/logo.png", remark: "Visual fixture" },
        },
      }),
    });
  });

  await page.locator('.sub-item-action[aria-label="停用"]').first().click();
  await expect(page.locator(".sub-item-state").first()).toHaveText("已停用");
  await expect(page.locator('.sub-item-action[aria-label="启用"]').first()).toBeVisible();

  await page.locator('.sub-item-action[aria-label="启用"]').first().click();
  await expect(page.locator(".sub-item-state")).toHaveCount(0);
  expect(bodies).toEqual([{ enabled: false }, { enabled: true }]);
});

test("saving a disabled source keeps it disabled", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");

  const source = {
    id: "hk-nodes",
    name: "HK Nodes",
    type: "local",
    url: "",
    content: "trojan://password@example.com:443#Local",
    filters: [],
    enabled: false,
    meta: { tag: ["hk"], icon: "/logo.png", remark: "Visual fixture" },
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
  let saved: { enabled?: boolean } | null = null;
  await page.route("**/api/sources/hk-nodes", async (route) => {
    if (route.request().method() !== "GET") {
      saved = route.request().postDataJSON();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: source }),
    });
  });
  await page.route("**/api/preview/source", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          processed: [{ id: "n", type: "trojan", name: "Local", server: "example.com", port: 443 }],
          original: [{ id: "n", type: "trojan", name: "Local", server: "example.com", port: 443 }],
          filtered: [],
          renamed: [],
        },
      }),
    }),
  );

  await page.goto("/edit/subs/hk-nodes", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".submit-btn")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);
  await page.locator(".submit-btn").first().click({ force: true });
  await expect.poll(() => saved?.enabled, { timeout: 10_000 }).toBe(false);
});

test("a touch drag reorders the list", async ({ page, context }) => {
  /* SortableJS only starts on touch when the device advertises touch. */
  await context.addInitScript(() => {
    Object.defineProperty(window, "ontouchstart", { value: () => {} });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");

  const sources = ["a-one", "b-two", "c-three"].map((id, index) => ({
    id,
    name: id,
    type: "local",
    url: "",
    content: `trojan://password@example.com:443#Node${index}`,
    filters: [],
    enabled: true,
    meta: { tag: [], icon: "/logo.png", remark: "" },
  }));
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { env: ENV_PAYLOAD, settings: SETTINGS_PAYLOAD, sources, collections: [] },
      }),
    }),
  );
  let sorted: string[] | null = null;
  await page.route("**/api/sort/sources", async (route) => {
    sorted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: sources }),
    });
  });

  await page.goto("/subs", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sub-item-wrapper").first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);

  const first = await page.locator(".sub-item-wrapper").nth(0).boundingBox();
  const second = await page.locator(".sub-item-wrapper").nth(1).boundingBox();
  const startX = (first?.x ?? 0) + 40;
  const startY = (first?.y ?? 0) + 30;
  const endY = (second?.y ?? 0) + (second?.height ?? 0);

  const client = await context.newCDPSession(page);
  const touch = (type: string, x: number, y: number) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
    });

  await touch("touchStart", startX, startY);
  await page.waitForTimeout(350);
  for (let step = 1; step <= 6; step += 1) {
    await touch("touchMove", startX, startY + ((endY - startY) * step) / 6);
    await page.waitForTimeout(80);
  }
  await touch("touchEnd", startX, endY);

  await expect.poll(() => sorted, { timeout: 5_000 }).not.toBeNull();
  expect(sorted![0]).toBe("b-two");
});

test("a slow backend still lands on the list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  /* The boot timeout is 3s; answering after it used to leave the failure
     panel up even though the data had arrived. */
  await page.route("**/api/bootstrap", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4500));
    await route.fallback();
  });
  await page.goto("/subs", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sub-item-wrapper").first()).toBeVisible({ timeout: 12_000 });
});

test("an oversized backup is refused before it uploads", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");
  await page.goto("/my", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  let posted = false;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/storage")) posted = true;
  });
  await page.setInputFiles("input[type=file]", {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(5 * 1024 * 1024, "x"),
  });
  await expect(page.locator(".Toastify__toast")).toContainText("文件超过 4 MB");
  await expect(page.locator(".app-dialog__content")).toHaveCount(0);
  expect(posted).toBe(false);
});

test("the editor keeps undo history per source", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await prepareVisualPage(page);
  await installVisualMocks(page, "populated");

  const localSource = (id: string, node: string) => ({
    id,
    name: id,
    type: "local",
    url: "",
    content: `trojan://password@example.com:443#${node}`,
    filters: [],
    enabled: true,
    meta: {},
  });
  const first = localSource("a-one", "NodeA");
  const second = localSource("b-two", "NodeB");
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { env: ENV_PAYLOAD, settings: SETTINGS_PAYLOAD, sources: [first, second], collections: [] },
      }),
    }),
  );
  for (const item of [first, second]) {
    await page.route(`**/api/sources/${item.id}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: item }),
      }),
    );
  }

  await page.goto("/edit/subs/a-one", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".submit-btn")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(900);
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\ntrojan://password@example.com:444#EditedA");

  await page.goto("/edit/subs/b-two", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".submit-btn")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(900);
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+z");

  const content = await page.locator(".cm-content").first().innerText();
  expect(content).toContain("NodeB");
  expect(content).not.toContain("EditedA");
});
