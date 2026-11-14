import type { AppSettings, FilterRule, RoutingTemplate, SubscriptionTarget } from "../../types";
import { isTargetCompatible } from "./compatibility";
import { applyFilters, ensureUniqueProxyNames } from "./filters";
import { decodeMaybeBase64, formatInvalidLocalContentError, parseProxies } from "./parsing/parse";
import { renderTarget } from "./render";

export async function convertSubscriptionContent(input: {
  content: string;
  target: SubscriptionTarget;
  filters?: FilterRule[];
  template?: RoutingTemplate;
  settings?: AppSettings;
}) {
  const parsed = parseProxies(decodeMaybeBase64(input.content));
  if (parsed.length === 0) throw new Error(formatInvalidLocalContentError(input.content));
  const processed = ensureUniqueProxyNames(await applyFilters(parsed, input.filters || [], input.settings, {
    targetPlatform: input.target,
    sourceId: "one-shot",
  }));
  const supported = processed.filter((proxy) => isTargetCompatible(proxy, input.target));
  const output = renderTarget(supported, input.target, input.template?.config);
  return {
    content: output,
    parsed: parsed.length,
    emitted: supported.length,
    skipped: processed.length - supported.length,
    warnings: processed.length === supported.length
      ? []
      : [`${processed.length - supported.length} node(s) cannot be represented by ${input.target}`],
  };
}
