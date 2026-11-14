import { Hono } from "hono";
import { DEFAULT_RULESET_CDN } from "../../lib/defaults";
import { success } from "../../lib/http";
import { listScriptMetadata } from "../../lib/scripts";
import {
  exportStorage,
  getSettings,
  importStorage,
  listCollections,
  listSources,
  updateSettings,
} from "../../lib/store";
import { objectValue, type JsonMap } from "../../lib/values";
import { toApiCollection, toApiSource } from "./dto";
import { parseJsonOrText } from "./shared";

export const metaRoutes = new Hono<{ Bindings: SubStoreEnv }>();

const FRONTEND_VERSION = "1.1.0";

metaRoutes.get("/env", async (c) => success(c, envPayload(c.env)));
// Everything the admin UI needs for its first paint in one round trip. The UI
// used to call /env, /sources, /collections and /settings in sequence, which
// cost three extra round trips before it could render anything.
metaRoutes.get("/bootstrap", async (c) => {
  const [sources, collections, settings] = await Promise.all([
    listSources(c.env),
    listCollections(c.env),
    getSettings(c.env),
  ]);
  return success(c, {
    env: envPayload(c.env),
    settings: mergeSettings(defaultSettings(c.env), settings),
    sources: sources.map(toApiSource),
    collections: collections.map(toApiCollection),
  });
});
metaRoutes.get("/scripts", async (c) => success(c, listScriptMetadata()));
metaRoutes.get("/settings", async (c) => success(c, mergeSettings(defaultSettings(c.env), await getSettings(c.env))));
metaRoutes.patch("/settings", async (c) => {
  const input: JsonMap = await c.req.json<JsonMap>().catch(() => ({}));
  const settings = await updateSettings(c.env, input);
  return success(c, mergeSettings(defaultSettings(c.env), settings));
});
metaRoutes.get("/storage", async (c) => {
  const payload = await exportStorage(c.env);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="sub-store-cloudflare-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
metaRoutes.post("/storage", async (c) => {
  const input = await parseJsonOrText(c);
  return success(c, await importStorage(c.env, input));
});

function envPayload(env: SubStoreEnv) {
  return {
    app: env.SUB_STORE_APP_NAME || "Sub-Store Cloudflare",
    backend: "Cloudflare",
    version: FRONTEND_VERSION,
    runtime: "Cloudflare Workers",
    storage: "D1",
    feature: {
      buildTimeScripts: true,
      proxyConversion: true,
      ruleConversion: true,
      scopedShares: true,
      recycleBin: true,
      nodeInfo: true,
      surgeMac: true,
    },
    meta: {
      cloudflare: {
        env: {
          SUB_STORE_BACKEND_CUSTOM_NAME: env.SUB_STORE_APP_NAME || "Sub-Store Cloudflare",
          SUB_STORE_DOCKER: "false",
        },
      },
    },
  };
}

function defaultSettings(env: SubStoreEnv) {
  return {
    defaultUserAgent: "clash.meta/v1.19.24",
    defaultFlowUserAgent: "clash.meta/v1.19.24",
    defaultTimeout: "30000",
    backendRequestConcurrency: "3",
    backendRequestConcurrencyWaitTime: "100",
    remoteCacheTtl: "900",
    remoteCacheStaleOnError: true,
    outputCacheTtl: "30",
    rulesetCdn: DEFAULT_RULESET_CDN,
    nodeInfoApiUrl: "https://ipwho.is/{ip}",
    theme: { auto: true, name: "light", dark: "dark", light: "light" },
    appearanceSetting: {
      isSimpleMode: true,
      isShowIcon: true,
      isSimpleShowRemark: false,
      editorCommonDisplayMode: "expanded",
      manualSubscriptionsDisplayMode: "collapsed",
      editorGroupingMode: "always",
      showFloatingRefreshButton: false,
      showFloatingAddButton: false,
      displayPreviewInWebPage: true,
      subProgressStyle: "hidden",
      listPageViewMode: "single-column",
      listPageViewModeInWideScreenNarrowMode: "single-column",
      useNarrowModeOnWideScreen: false,
    },
    appName: env.SUB_STORE_APP_NAME || "Sub-Store Cloudflare",
  };
}

function mergeSettings(base: JsonMap, input: JsonMap) {
  return {
    ...base,
    ...input,
    theme: { ...objectValue(base.theme), ...objectValue(input.theme) },
    appearanceSetting: { ...objectValue(base.appearanceSetting), ...objectValue(input.appearanceSetting) },
  };
}
