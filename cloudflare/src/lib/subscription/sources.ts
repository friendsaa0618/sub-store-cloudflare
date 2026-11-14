import {
  MAX_REMOTE_SOURCE_RESPONSE_BYTES,
  MAX_REMOTE_SOURCE_TOTAL_BYTES,
  MAX_REMOTE_SOURCE_URLS,
} from "../limits";
import { readResponseText, utf8ByteLength } from "../read";
import type {
  AppSettings,
  SubscriptionResponseMetadata,
  SubscriptionSource,
} from "../../types";
import { getRequestConcurrency, getRequestConcurrencyWait, getRequestTimeout, runWithConcurrency } from "./concurrency";
import { decodeMaybeBase64 } from "./parsing/parse";
import type { BuildOptions, InternalBuildOptions } from "./types";
import { numberSetting, stringSetting } from "./utils";

export function getSources(options: BuildOptions) {
  if (!options.collection) return options.source ? [options.source] : [];

  const sourceIds = options.collection.sourceIds || [];
  if (sourceIds.length === 0) return options.sources;
  const byIdOrName = new Map<string, SubscriptionSource>();
  for (const source of options.sources) {
    if (!byIdOrName.has(source.id)) byIdOrName.set(source.id, source);
    if (!byIdOrName.has(source.name)) byIdOrName.set(source.name, source);
  }
  return sourceIds
    .map((id) => byIdOrName.get(id))
    .filter((source): source is SubscriptionSource => Boolean(source));
}

export async function loadSubscriptionRaw(
  sub: SubscriptionSource,
  settings?: AppSettings,
  requestUserAgent?: string,
  runtime?: Pick<InternalBuildOptions, "responseMetadata" | "forceRefresh" | "waitUntil">,
) {
  // Rows written before the type was enforced may carry content on a remote
  // source; the type decides, so those rows fetch again instead of going stale.
  if (sub.type === "local" || (!sub.type && sub.content)) {
    runtime?.responseMetadata.set(sub.id, metadataFromSource(sub));
    return String(sub.content || sub.url || "");
  }

  const urls = splitSourceUrls(sub.url);
  if (urls.length === 0) throw new Error(`Remote source ${sub.name} has no valid URL`);
  if (urls.length > MAX_REMOTE_SOURCE_URLS) {
    throw new Error(`Remote source ${sub.name} exceeds the ${MAX_REMOTE_SOURCE_URLS} URL limit`);
  }

  const contents = await runWithConcurrency(
    urls.map((url) => async () => fetchSubscriptionUrl(url, sub, settings, requestUserAgent, runtime)),
    getRequestConcurrency(settings),
    getRequestConcurrencyWait(settings),
  );
  const totalBytes = contents.reduce((total, item) => total + utf8ByteLength(item.content), 0);
  if (totalBytes > MAX_REMOTE_SOURCE_TOTAL_BYTES) {
    throw new Error(`Remote source ${sub.name} exceeds the ${MAX_REMOTE_SOURCE_TOTAL_BYTES / (1024 * 1024)} MiB combined limit`);
  }
  const metadata = contents.map((item) => item.metadata).find((item) => Object.keys(item).length > 0) || metadataFromSource(sub);
  runtime?.responseMetadata.set(sub.id, metadata);
  return contents.map((item) => decodeMaybeBase64(item.content)).join("\n");
}

function splitSourceUrls(raw: string) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

async function fetchSubscriptionUrl(
  url: string,
  sub: SubscriptionSource,
  settings?: AppSettings,
  requestUserAgent?: string,
  runtime?: Pick<InternalBuildOptions, "forceRefresh" | "waitUntil">,
) {
  const cacheTtl = numberSetting(sub.meta?.cacheTtl ?? settings?.remoteCacheTtl, REMOTE_CACHE_DEFAULT_TTL, 0, REMOTE_CACHE_MAX_TTL);
  const cacheKey = cacheTtl > 0 ? await remoteCacheKey(url, getSourceUserAgent(sub, settings, requestUserAgent)) : undefined;
  const cached = cacheKey ? await safeCacheMatch(cacheKey) : undefined;

  if (cached && !runtime?.forceRefresh) {
    if (remoteCacheAgeMs(cached) <= cacheTtl * 1000) {
      return {
        content: await readResponseText(cached, MAX_REMOTE_SOURCE_RESPONSE_BYTES, `Cached remote source ${sub.name}`),
        metadata: metadataFromResponse(cached, "hit"),
      };
    }
    // Stale-while-revalidate: a download must not wait for a provider that is
    // slow to answer. Serve the expired copy now and refresh it in the
    // background, so the next request sees fresh content.
    if (runtime?.waitUntil) {
      const stale = {
        content: await readResponseText(cached, MAX_REMOTE_SOURCE_RESPONSE_BYTES, `Stale remote source ${sub.name}`),
        metadata: metadataFromResponse(cached, "stale"),
      };
      runtime.waitUntil(
        refreshRemoteSource(url, sub, settings, requestUserAgent, cacheKey, cacheTtl, cached, false).catch(() => undefined),
      );
      return stale;
    }
  }

  return refreshRemoteSource(url, sub, settings, requestUserAgent, cacheKey, cacheTtl, cached, runtime?.forceRefresh === true, runtime);
}

async function refreshRemoteSource(
  url: string,
  sub: SubscriptionSource,
  settings: AppSettings | undefined,
  requestUserAgent: string | undefined,
  cacheKey: Request | undefined,
  cacheTtl: number,
  cached: Response | undefined,
  forceRefresh: boolean,
  runtime?: Pick<InternalBuildOptions, "waitUntil">,
) {
  const writeCache = async (content: string, metadata: SubscriptionResponseMetadata) => {
    if (!cacheKey || cacheTtl <= 0) return;
    const put = safeCachePut(cacheKey, content, metadata, cacheTtl);
    if (runtime?.waitUntil) runtime.waitUntil(put);
    else await put;
  };
  const controller = new AbortController();
  const timeout = getRequestTimeout(settings);
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const requestHeaders: Record<string, string> = { "user-agent": getSourceUserAgent(sub, settings, requestUserAgent) };
    if (cached?.headers.get("x-sub-store-etag")) requestHeaders["if-none-match"] = cached.headers.get("x-sub-store-etag") || "";
    if (cached?.headers.get("x-sub-store-last-modified")) requestHeaders["if-modified-since"] = cached.headers.get("x-sub-store-last-modified") || "";
    const response = await fetch(url, {
      headers: requestHeaders,
      signal: controller.signal,
    });
    if (response.status === 304 && cached) {
      const refreshed = {
        content: await readResponseText(cached, MAX_REMOTE_SOURCE_RESPONSE_BYTES, `Cached remote source ${sub.name}`),
        metadata: metadataFromResponse(cached, "refresh"),
      };
      // A 304 still means the cached copy is fresh again.
      await writeCache(refreshed.content, refreshed.metadata);
      return refreshed;
    }
    if (!response.ok) throw new Error(`Remote source ${sub.name} failed: ${response.status}`);
    const content = await readResponseText(response, MAX_REMOTE_SOURCE_RESPONSE_BYTES, `Remote source ${sub.name}`);
    const metadata = metadataFromResponse(response, forceRefresh ? "refresh" : "miss");
    await writeCache(content, metadata);
    return { content, metadata };
  } catch (error) {
    if (cached && settings?.remoteCacheStaleOnError !== false) {
      return {
        content: await readResponseText(cached, MAX_REMOTE_SOURCE_RESPONSE_BYTES, `Stale remote source ${sub.name}`),
        metadata: metadataFromResponse(cached, "stale"),
      };
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getSourceUserAgent(sub: SubscriptionSource, settings?: AppSettings, requestUserAgent?: string) {
  const explicitUserAgent = stringSetting(sub.meta?.ua) || stringSetting(sub.meta?.userAgent);
  if (explicitUserAgent) return explicitUserAgent;
  if (sub.meta?.passThroughUA === true || sub.meta?.passThroughUA === "true") {
    return stringSetting(requestUserAgent) || stringSetting(settings?.defaultUserAgent) || "clash.meta/v1.19.24";
  }
  return (
    stringSetting(settings?.defaultUserAgent)
    || "clash.meta/v1.19.24"
  );
}

function metadataFromSource(source: SubscriptionSource): SubscriptionResponseMetadata {
  return {
    subscriptionUserinfo: stringSetting(source.meta?.subUserinfo) || stringSetting(source.meta?.subscriptionUserinfo),
    profileWebPageUrl: stringSetting(source.meta?.profileWebPageUrl) || stringSetting(source.meta?.appUrl),
    profileUpdateInterval: stringSetting(source.meta?.profileUpdateInterval),
    contentDisposition: safeContentDisposition(stringSetting(source.meta?.contentDisposition)),
    cacheStatus: "disabled",
  };
}

function metadataFromResponse(response: Response, cacheStatus: SubscriptionResponseMetadata["cacheStatus"]): SubscriptionResponseMetadata {
  return {
    subscriptionUserinfo: response.headers.get("subscription-userinfo") || response.headers.get("x-sub-store-subscription-userinfo") || undefined,
    profileWebPageUrl: response.headers.get("profile-web-page-url") || response.headers.get("x-sub-store-profile-web-page-url") || undefined,
    profileUpdateInterval: response.headers.get("profile-update-interval") || response.headers.get("x-sub-store-profile-update-interval") || undefined,
    contentDisposition: safeContentDisposition(response.headers.get("content-disposition") || response.headers.get("x-sub-store-content-disposition") || ""),
    etag: response.headers.get("etag") || response.headers.get("x-sub-store-etag") || undefined,
    lastModified: response.headers.get("last-modified") || response.headers.get("x-sub-store-last-modified") || undefined,
    cacheStatus,
  };
}

const REMOTE_CACHE_DEFAULT_TTL = 900;
const REMOTE_CACHE_MAX_TTL = 3600;
const REMOTE_CACHE_STALE_MULTIPLIER = 4;

function remoteCacheAgeMs(response: Response) {
  const fetchedAt = Number(response.headers.get("x-sub-store-fetched-at"));
  return Number.isFinite(fetchedAt) && fetchedAt > 0 ? Math.max(0, Date.now() - fetchedAt) : Number.POSITIVE_INFINITY;
}

async function remoteCacheKey(url: string, userAgent: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${url}\n${userAgent}`));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`https://sub-store-cache.invalid/source/${hash}`);
}

async function safeCacheMatch(key: Request) {
  try {
    return await caches.default.match(key);
  } catch {
    return undefined;
  }
}

async function safeCachePut(
  key: Request,
  content: string,
  metadata: SubscriptionResponseMetadata,
  ttl: number,
) {
  try {
    const headers = new Headers({
      "content-type": "text/plain; charset=utf-8",
      // Keep the entry around after it goes stale so a download can be served
      // from it while the refresh runs in the background.
      "cache-control": `public, s-maxage=${ttl * REMOTE_CACHE_STALE_MULTIPLIER}`,
      "x-sub-store-fetched-at": String(Date.now()),
    });
    setInternalMetadataHeader(headers, "x-sub-store-subscription-userinfo", metadata.subscriptionUserinfo);
    setInternalMetadataHeader(headers, "x-sub-store-profile-web-page-url", metadata.profileWebPageUrl);
    setInternalMetadataHeader(headers, "x-sub-store-profile-update-interval", metadata.profileUpdateInterval);
    setInternalMetadataHeader(headers, "x-sub-store-content-disposition", metadata.contentDisposition);
    setInternalMetadataHeader(headers, "x-sub-store-etag", metadata.etag);
    setInternalMetadataHeader(headers, "x-sub-store-last-modified", metadata.lastModified);
    await caches.default.put(key, new Response(content, { headers }));
  } catch {
    // Cache API is optional and must not affect subscription generation.
  }
}

function setInternalMetadataHeader(headers: Headers, name: string, value: string | undefined) {
  if (value) headers.set(name, value.slice(0, 4096));
}

function safeContentDisposition(value: string) {
  if (!value || /[\r\n]/.test(value)) return undefined;
  const filename = value.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)?.[1]?.trim();
  if (!filename) return undefined;
  const safe = filename.replace(/[^a-zA-Z0-9._()\-\u4e00-\u9fff ]/g, "_").slice(0, 120);
  return safe ? `attachment; filename="${safe}"` : undefined;
}
