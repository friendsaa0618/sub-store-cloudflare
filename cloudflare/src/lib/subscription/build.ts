import type { SubscriptionResponseMetadata } from "../../types";
import { getRequestConcurrency, getRequestConcurrencyWait, runSettledWithConcurrency, runWithConcurrency } from "./concurrency";
import { applyFilters, ensureUniqueProxyNames, getFilters } from "./filters";
import { parseProxies } from "./parsing/parse";
import { renderBuildTarget } from "./render";
import { getSources, loadSubscriptionRaw } from "./sources";
import type { BuildOptions, InternalBuildOptions } from "./types";

export async function buildSubscription(options: BuildOptions) {
  return (await buildSubscriptionResult(options)).body;
}

export async function buildSubscriptionResult(options: BuildOptions) {
  const internal: InternalBuildOptions = { ...options, responseMetadata: new Map() };
  const proxies = await loadProxyNodes(internal);
  if (proxies.length === 0) {
    const selected = getSources(internal);
    if (selected.length > 0 && selected.every((source) => source.enabled === false)) {
      throw new Error("Every selected source is disabled");
    }
    throw new Error("No available nodes found");
  }
  const body = renderBuildTarget(proxies, options);
  return { body, metadata: selectResponseMetadata(internal), nodes: proxies.length };
}

async function loadProxyNodes(options: InternalBuildOptions) {
  const sources = getSources(options).filter((sub) => sub.enabled !== false);
  if (sources.length === 0) return [];

  const tasks = sources.map((sub) => async () => applyFilters(
    parseProxies(await loadSubscriptionRaw(sub, options.settings, options.requestUserAgent, options)),
    getFilters(sub),
    options.settings,
    { targetPlatform: options.target, sourceId: sub.id },
  ));
  const proxyLists = options.collection?.ignoreFailed
    ? (await runSettledWithConcurrency(tasks, getRequestConcurrency(options.settings), getRequestConcurrencyWait(options.settings))).flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      )
    : await runWithConcurrency(tasks, getRequestConcurrency(options.settings), getRequestConcurrencyWait(options.settings));

  return ensureUniqueProxyNames(await applyFilters(proxyLists.flat(), getFilters(options.collection), options.settings, {
    targetPlatform: options.target,
    collectionId: options.collection?.id,
  }));
}

function selectResponseMetadata(options: InternalBuildOptions) {
  const ordered = getSources(options);
  for (const source of ordered) {
    const metadata = options.responseMetadata.get(source.id);
    if (metadata) return metadata;
  }
  return {} as SubscriptionResponseMetadata;
}
