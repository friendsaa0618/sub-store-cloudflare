import type { AppSettings, SubscriptionSource } from "../../types";
import { getRequestConcurrency, getRequestConcurrencyWait, runWithConcurrency } from "./concurrency";
import { applyFilters, ensureUniqueProxyNames, getFilters } from "./filters";
import { addPreviewIds, decodeMaybeBase64, formatInvalidLocalContentError, parseProxies } from "./parsing/parse";
import { getSources, loadSubscriptionRaw } from "./sources";
import type { BuildOptions } from "./types";

export async function previewSubscription(options: Pick<BuildOptions, "source" | "collection" | "sources" | "settings" | "requestUserAgent">) {
  const selected = getSources({
    ...options,
    requestUrl: new URL("https://sub-store.local/preview"),
    target: "json",
  });
  /* A collection preview has to show what the download would serve, so a
     disabled source is skipped here too. A single source stays visible: the
     user asked for that one. */
  const sources = options.collection ? selected.filter((sub) => sub.enabled !== false) : selected;
  const originalLists = await runWithConcurrency(
    sources.map((sub) => async () => parseProxies(await loadSubscriptionRaw(sub, options.settings, options.requestUserAgent))),
    getRequestConcurrency(options.settings),
    getRequestConcurrencyWait(options.settings),
  );
  const original = addPreviewIds(originalLists.flat());
  const processedLists = await runWithConcurrency(
    originalLists.map((nodes, index) => async () => applyFilters(nodes, getFilters(sources[index]), options.settings, {
      targetPlatform: "json",
      sourceId: sources[index].id,
    })),
    getRequestConcurrency(options.settings),
    getRequestConcurrencyWait(options.settings),
  );
  const processed = addPreviewIds(ensureUniqueProxyNames(await applyFilters(processedLists.flat(), getFilters(options.collection), options.settings, {
    targetPlatform: "json",
    collectionId: options.collection?.id,
  })));

  return { original, processed };
}

export async function previewSourceContent(source: SubscriptionSource, settings?: AppSettings) {
  const original = parseProxies(decodeMaybeBase64(source.content || source.url || ""));
  if (original.length === 0) throw new Error(formatInvalidLocalContentError(source.content || source.url || ""));
  const processed = ensureUniqueProxyNames(await applyFilters(original, getFilters(source), settings, {
    targetPlatform: "json",
    sourceId: source.id,
  }));
  return {
    original: addPreviewIds(original),
    processed: addPreviewIds(processed),
  };
}

export function validateSubscriptionContent(raw: string) {
  const proxies = parseProxies(decodeMaybeBase64(raw));
  if (proxies.length === 0) throw new Error(formatInvalidLocalContentError(raw));
  return addPreviewIds(proxies);
}
