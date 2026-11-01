import type { Page } from "@playwright/test";

import {
  ENV_PAYLOAD,
  POPULATED_COLLECTIONS,
  POPULATED_RECYCLE,
  POPULATED_SHARES,
  POPULATED_SOURCES,
  POPULATED_TEMPLATES,
  SETTINGS_PAYLOAD,
  type VisualScenario,
} from "./fixtures";

const ok = (data: unknown) => ({ status: "success" as const, data });

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#94a3b8"/></svg>`;

const json = (data: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(data),
});

export async function installVisualMocks(page: Page, scenario: VisualScenario) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const host = url.hostname;
    const path = url.pathname;

    if (host.includes("jsdelivr.net") || host.includes("unpkg.com") || host.includes("fonts.googleapis.com")) {
      await route.abort();
      return;
    }

    if (host.includes("dicebear.com")) {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: PLACEHOLDER_SVG,
      });
      return;
    }

    if (!path.startsWith("/api/")) {
      await route.continue();
      return;
    }

    if (scenario === "unauthorized") {
      await route.fulfill(json({ status: "failed", error: { message: "Unauthorized" } }, 401));
      return;
    }

    const empty = scenario === "empty";

    if (path === "/api/env") {
      await route.fulfill(json(ok(ENV_PAYLOAD)));
      return;
    }
    if (path === "/api/bootstrap") {
      await route.fulfill(json(ok({
        env: ENV_PAYLOAD,
        settings: SETTINGS_PAYLOAD,
        sources: empty ? [] : POPULATED_SOURCES,
        collections: empty ? [] : POPULATED_COLLECTIONS,
      })));
      return;
    }
    if (path === "/api/settings") {
      await route.fulfill(json(ok(SETTINGS_PAYLOAD)));
      return;
    }
    if (path === "/api/sources") {
      await route.fulfill(json(ok(empty ? [] : POPULATED_SOURCES)));
      return;
    }
    if (path === "/api/collections") {
      await route.fulfill(json(ok(empty ? [] : POPULATED_COLLECTIONS)));
      return;
    }
    if (path === "/api/templates") {
      await route.fulfill(json(ok(empty ? [] : POPULATED_TEMPLATES)));
      return;
    }
    if (path === "/api/scripts") {
      await route.fulfill(json(ok([])));
      return;
    }
    if (path === "/api/shares") {
      await route.fulfill(json(ok(empty ? [] : POPULATED_SHARES)));
      return;
    }
    if (path === "/api/recycle-bin") {
      await route.fulfill(json(ok(empty ? [] : POPULATED_RECYCLE)));
      return;
    }
    if (path.startsWith("/api/source/flow/")) {
      await route.fulfill(json({ status: "failed", error: { message: "No flow info" } }, 404));
      return;
    }

    await route.fulfill(json(ok(null)));
  });
}

export async function prepareVisualPage(page: Page, options?: { token?: string | null }) {
  const token = options?.token === undefined ? "visual-token" : options.token;
  await page.addInitScript((storedToken) => {
    localStorage.setItem("locale", "zh");
    if (storedToken) {
      localStorage.setItem("substore_admin_token", storedToken);
    } else {
      localStorage.removeItem("substore_admin_token");
    }
  }, token);
}
