import type { AppSettings, SubscriptionResponseMetadata } from "../types";
import { numberSetting } from "./subscription/utils";

const OUTPUT_CACHE_DEFAULT_TTL = 30;
const OUTPUT_CACHE_MAX_TTL = 300;

export type CachedOutput = {
  body: string;
  metadata: SubscriptionResponseMetadata;
  contentType: string;
};

export type OutputCacheContext = {
  key: Request;
  ttl: number;
};

type OutputCacheInput = {
  kind: "source" | "collection";
  id: string;
  target: string;
  host: string;
  token: string;
  requestUserAgent: string;
  query: string;
  collection?: unknown;
  source?: unknown;
  sources: unknown;
  template?: unknown;
  settings: AppSettings;
};

export function getOutputCacheTtl(settings?: AppSettings) {
  return numberSetting(settings?.outputCacheTtl, OUTPUT_CACHE_DEFAULT_TTL, 0, OUTPUT_CACHE_MAX_TTL);
}

export async function createOutputCacheContext(input: OutputCacheInput): Promise<OutputCacheContext | undefined> {
  const ttl = getOutputCacheTtl(input.settings);
  if (ttl <= 0 || !input.token) return undefined;

  const fingerprint = JSON.stringify({
    collection: input.collection ?? null,
    source: input.source ?? null,
    sources: input.sources,
    template: input.template ?? null,
    settings: input.settings,
    target: input.target,
    host: input.host,
    requestUserAgent: input.requestUserAgent,
    query: input.query,
  });
  const [tokenHash, configHash] = await Promise.all([
    sha256(input.token),
    sha256(fingerprint),
  ]);
  const key = new Request(
    `https://sub-store-cache.invalid/output/${input.kind}/${encodeURIComponent(input.id)}/${encodeURIComponent(input.target)}/${encodeURIComponent(input.host)}/${tokenHash}/${configHash}`,
  );
  return { key, ttl };
}

export async function readOutputCache(key: Request): Promise<CachedOutput | undefined> {
  try {
    const response = await caches.default.match(key);
    if (!response) return undefined;
    const cached = await response.json() as Partial<CachedOutput>;
    if (typeof cached.body !== "string" || typeof cached.contentType !== "string") return undefined;
    return {
      body: cached.body,
      contentType: cached.contentType,
      metadata: cached.metadata && typeof cached.metadata === "object" ? cached.metadata : {},
    };
  } catch {
    return undefined;
  }
}

export async function writeOutputCache(key: Request, value: CachedOutput, ttl: number) {
  try {
    await caches.default.put(key, new Response(JSON.stringify(value), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, s-maxage=${ttl}`,
      },
    }));
  } catch {
    // Cache API is optional and must not affect subscription generation.
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
