import { Hono } from "hono";
import type { Context } from "hono";
import { failed, isTokenValid } from "../lib/http";
import { authorizeScopedDownload } from "../lib/compatibility-resources";
import { isResourceLinkToken } from "../lib/link-token";
import { createOutputCacheContext, readOutputCache, writeOutputCache, type CachedOutput } from "../lib/output-cache";
import { loadConvertedRuleSet } from "../lib/ruleset";
import { buildSubscriptionResult, getTargetContentType, normalizeTarget, normalizeTargetAlias } from "../lib/subscription";
import { getCollection, getRoutingTemplate, getSettings, getSource, getSubscriptionCollection, getSubscriptionSources, getSubscriptionSourcesByIds, subscriptionSourceFromRecord } from "../lib/store";
import type { AppSettings, RoutingTemplate, RoutingTemplateConfig, SubscriptionCollection, SubscriptionSource, SubscriptionTarget } from "../types";

export const downloadRoutes = new Hono<{ Bindings: SubStoreEnv }>();

type DownloadContext = Context<{ Bindings: SubStoreEnv }>;

// Clash rule providers are not valid sing-box rule sets, so the sing-box output
// points at this route and gets the provider converted to the sing-box source
// format. Must be registered before the collection route: it has one more path
// segment, so `/download/collection/<id>/ruleset/<provider>` never reaches it.
downloadRoutes.get("/download/collection/:name/ruleset/:provider/:token?", async (c) => {
  const collection = await getSubscriptionCollection(c.env, c.req.param("name"));
  if (!collection) return failed(c, "Collection not found", 404);
  const auth = await authorizeDownload(c, "collection", c.req.param("name"), "sing-box");
  if (auth instanceof Response) return auth;

  const template = await getRoutingTemplate(c.env, collection.templateId);
  const provider = findRuleProvider(template?.config, c.req.param("provider"));
  if (!provider) return failed(c, "Rule provider not found", 404);

  try {
    return await loadConvertedRuleSet(provider.url, provider.ttl);
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 502);
  }
});

downloadRoutes.get("/download/collection/:name/:target?/:token?", async (c) => {
  const target = getDownloadTarget(c);
  if (!target) return failed(c, "Unsupported target", 400);
  const auth = await authorizeDownload(c, "collection", c.req.param("name"), target);
  if (auth instanceof Response) return auth;

  const collection = await getSubscriptionCollection(c.env, c.req.param("name"));
  if (!collection) {
    /* A disabled collection is still there; saying "not found" hides why the
       link stopped working. */
    const existing = await getCollection(c.env, c.req.param("name"));
    return failed(c, existing ? "Collection is disabled" : "Collection not found", 404);
  }

  const [sources, template, settings] = await Promise.all([
    collection.sourceIds?.length
      ? getSubscriptionSourcesByIds(c.env, collection.sourceIds)
      : getSubscriptionSources(c.env),
    getRoutingTemplate(c.env, collection.templateId),
    getSettings(c.env),
  ]);

  return renderDownload(c, {
    collection,
    sources,
    template,
    settings,
    target,
    scopedToken: auth.scoped,
  });
});

downloadRoutes.get("/download/source/:name/:target?/:token?", async (c) => {
  const target = getDownloadTarget(c);
  if (!target) return failed(c, "Unsupported target", 400);
  const auth = await authorizeDownload(c, "source", c.req.param("name"), target);
  if (auth instanceof Response) return auth;

  const [source, template, settings] = await Promise.all([
    getSource(c.env, c.req.param("name")),
    getRoutingTemplate(c.env, undefined),
    getSettings(c.env),
  ]);
  if (!source) return failed(c, "Subscription not found", 404);
  if (!source.enabled) return failed(c, "Subscription is disabled", 404);
  const subscriptionSource = subscriptionSourceFromRecord(source);

  return renderDownload(c, {
    source: subscriptionSource,
    sources: [subscriptionSource],
    target,
    template,
    settings,
    scopedToken: auth.scoped,
  });
});

async function renderDownload(
  c: DownloadContext,
  options: {
    source?: SubscriptionSource;
    collection?: SubscriptionCollection;
    sources: SubscriptionSource[];
    target: SubscriptionTarget;
    template: RoutingTemplate | undefined;
    settings: AppSettings;
    scopedToken: boolean;
  },
) {
  // `?url=` / `?content=` exist for ad-hoc links handed out by the admin. On a
  // host that only serves downloads they would turn the Worker into a generic
  // fetch proxy, so they are refused there.
  if (hasTemporarySourceOverride(c) && isDownloadOnlyHost(c)) {
    return failed(c, "Source overrides are not available on this host", 400);
  }
  const sourceOverride = getTemporarySourceOverride(c);
  const sources = sourceOverride ? applyTemporarySourceOverride(options.sources, sourceOverride, options.collection) : options.sources;
  const source = sourceOverride && options.source ? applyTemporarySourceOverride([options.source], sourceOverride)[0] : options.source;
  const requestUrl = new URL(c.req.url);
  const requestUserAgent = c.req.header("user-agent") || "";
  const forceRefresh = ["1", "true"].includes(c.req.query("refresh") || c.req.query("noCache") || "");
  const token = getDownloadToken(c) || "";
  // A token in the path would be copied into the `# Source:` comment, so never
  // put that output in a shared cache.
  const tokenInPath = Boolean(token && decodedPathname(requestUrl).includes(token));
  const sourcePath = tokenInPath ? withoutPathToken(requestUrl, token).pathname : requestUrl.pathname;
  const cacheQuery = [...requestUrl.searchParams.entries()]
    .filter(([key]) => !["token", "refresh", "noCache"].includes(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const cacheContext = !options.scopedToken && !sourceOverride && !tokenInPath
    ? await createOutputCacheContext({
        kind: options.collection ? "collection" : "source",
        id: options.collection?.id || options.source?.id || "",
        target: options.target,
        host: requestUrl.host,
        token,
        requestUserAgent,
        query: cacheQuery,
        collection: options.collection,
        source: options.source,
        sources,
        template: options.template,
        settings: options.settings,
      })
    : undefined;

  if (cacheContext && !forceRefresh) {
    const cached = await readOutputCache(cacheContext.key);
    if (cached) return outputResponse(cached, "hit");
  }

  try {
    const result = await buildSubscriptionResult({
      source,
      collection: options.collection,
      sources,
      requestUrl,
      sourcePath,
      target: options.target,
      template: options.template,
      settings: options.settings,
      requestUserAgent,
      forceRefresh,
      waitUntil: (promise) => c.executionCtx.waitUntil(promise),
    });
    const output: CachedOutput = {
      body: result.body,
      metadata: result.metadata,
      contentType: getTargetContentType(options.target),
    };
    if (cacheContext) await writeOutputCache(cacheContext.key, output, cacheContext.ttl);
    return outputResponse(output, cacheContext ? "miss" : "disabled");
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 500);
  }
}

function outputResponse(output: CachedOutput, outputCacheStatus: "hit" | "miss" | "disabled") {
  const headers = new Headers({
    "content-type": output.contentType,
    "profile-update-interval": output.metadata.profileUpdateInterval || "6",
    "cache-control": "no-store",
    "x-sub-store-output-cache": outputCacheStatus,
  });
  setResponseHeader(headers, "subscription-userinfo", output.metadata.subscriptionUserinfo);
  setResponseHeader(headers, "profile-web-page-url", output.metadata.profileWebPageUrl);
  setResponseHeader(headers, "content-disposition", output.metadata.contentDisposition);
  setResponseHeader(headers, "x-sub-store-cache", output.metadata.cacheStatus);
  return new Response(output.body, { headers });
}

function setResponseHeader(headers: Headers, name: string, value: string | undefined) {
  if (value && !/[\r\n]/.test(value)) headers.set(name, value);
}

function findRuleProvider(config: RoutingTemplateConfig | undefined, name: string) {
  const providers = (config?.ruleProviders || config?.["rule-providers"] || {}) as Record<string, { url?: unknown; interval?: unknown } | undefined>;
  const provider = providers[name];
  const url = typeof provider?.url === "string" ? provider.url.trim() : "";
  if (!url) return undefined;
  const interval = Math.trunc(Number(provider?.interval));
  return {
    url,
    ttl: Number.isFinite(interval) && interval > 0 ? Math.min(Math.max(interval, 60), 604800) : 86400,
  };
}

type TemporarySourceOverride = {
  url?: string;
  content?: string;
  ua?: string;
};

function isDownloadOnlyHost(c: DownloadContext) {
  const hostname = new URL(c.req.url).hostname.toLowerCase();
  return (c.env.SUB_STORE_PUBLIC_DOWNLOAD_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
    .includes(hostname);
}

function hasTemporarySourceOverride(c: DownloadContext) {
  return ["url", "content", "ua", "userAgent", "user-agent"].some((key) => stringQuery(c, key));
}

function getTemporarySourceOverride(c: DownloadContext): TemporarySourceOverride | undefined {
  const url = stringQuery(c, "url");
  const content = stringQuery(c, "content");
  const ua = stringQuery(c, "ua") || stringQuery(c, "userAgent") || stringQuery(c, "user-agent");
  if (!url && !content && !ua) return undefined;
  return { url, content, ua };
}

function applyTemporarySourceOverride(sources: SubscriptionSource[], override: TemporarySourceOverride, collection?: SubscriptionCollection) {
  const selectedIds = collection?.sourceIds || [];
  const overrideIndex = selectedIds.length > 0
    ? sources.findIndex((source) => selectedIds.includes(source.id) || selectedIds.includes(source.name))
    : 0;
  const targetIndex = overrideIndex >= 0 ? overrideIndex : 0;

  return sources.map((source, index) => {
    if (index !== targetIndex) return source;
    const meta = { ...(source.meta || {}) };
    if (override.ua) meta.ua = override.ua;
    return {
      ...source,
      type: override.content ? "local" : override.url ? "remote" : source.type,
      url: override.url || source.url,
      content: override.content || (override.url ? "" : source.content),
      meta,
    };
  });
}

function stringQuery(c: DownloadContext, key: string) {
  const value = c.req.query(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getDownloadToken(c: DownloadContext) {
  return c.req.param("token") || c.req.query("token");
}

function decodedPathname(url: URL) {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return url.pathname;
  }
}

function withoutPathToken(url: URL, token: string) {
  const next = new URL(url);
  next.pathname = decodedPathname(next).replace(new RegExp(`/${escapeRegExp(token)}/?$`), "/");
  return next;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type DownloadAuth = { scoped: boolean };

async function authorizeDownload(
  c: DownloadContext,
  resourceType: "source" | "collection",
  resourceId: string,
  target: SubscriptionTarget,
): Promise<DownloadAuth | Response> {
  const token = getDownloadToken(c);
  if (await isTokenValid(c.env.SUB_STORE_PUBLIC_DOWNLOAD_TOKEN, token)) return { scoped: false };
  if (await isResourceLinkToken(c.env, resourceType, resourceId, token)) return { scoped: false };
  if (await authorizeScopedDownload(c.env, token, resourceType, resourceId, target)) return { scoped: true };
  return failed(c, "Download token is invalid", 403);
}

function getDownloadTarget(c: DownloadContext, defaultTarget?: string) {
  const explicit = c.req.param("target") || c.req.query("target");
  if (explicit) return normalizeTargetAlias(explicit);
  return normalizeTarget(defaultTarget, c.req.header("user-agent") || "");
}
