import type { RoutingTemplateConfig, TemplateProxyGroup } from "../../types";
import { compileRegex, stringSetting, stripUndefined, uniqueStrings } from "./utils";

export const TEST_URL = "https://www.gstatic.com/generate_204";

const RULESET_CDN_ORIGINS = new Set(["https://cdn.jsdelivr.net"]);

export function rulesetCdnOrigin(value: unknown) {
  const text = stringSetting(value);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

export function withRulesetCdn(config: RoutingTemplateConfig | undefined, cdn: unknown): RoutingTemplateConfig | undefined {
  const origin = rulesetCdnOrigin(cdn);
  if (!config || !origin) return config;
  const key = config.ruleProviders ? "ruleProviders" : config["rule-providers"] ? "rule-providers" : "";
  const providers = key ? (config[key] as Record<string, unknown> | undefined) : undefined;
  if (!providers) return config;
  const rewritten = Object.fromEntries(
    Object.entries(providers).map(([name, value]) => {
      const entry = value as Record<string, unknown> | null;
      const url = entry && typeof entry === "object" ? stringSetting(entry.url) : "";
      if (!url) return [name, value];
      try {
        const parsed = new URL(url);
        if (!RULESET_CDN_ORIGINS.has(parsed.origin)) return [name, value];
        return [name, { ...entry, url: `${origin}${parsed.pathname}${parsed.search}` }];
      } catch {
        return [name, value];
      }
    }),
  );
  return { ...config, [key]: rewritten };
}

export function defaultProxyGroups(): TemplateProxyGroup[] {
  return [
    { name: "🚀 节点选择", type: "select", proxies: ["♻️ 自动选择", "🚀 手动切换", "DIRECT"] },
    { name: "♻️ 自动选择", type: "url-test", proxies: ["$all"], url: TEST_URL, interval: 300, tolerance: 50 },
    { name: "🚀 手动切换", type: "select", proxies: ["$all"] },
  ];
}

export type RenderedProxyGroup = Omit<TemplateProxyGroup, "filter" | "proxies"> & { proxies: string[] };

export function renderTemplateProxyGroups(nodeNames: string[], groupTemplates: TemplateProxyGroup[]): RenderedProxyGroup[] {
  const nodeNameSet = new Set(nodeNames);
  const allowedLiterals = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS"]);
  const expanded = groupTemplates.map((group) => ({
    ...group,
    proxies: expandGroupProxies(group, nodeNames),
  }));

  const includedGroupNames = new Set<string>();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const group of expanded) {
      if (includedGroupNames.has(group.name)) continue;
      const usable = group.proxies.some(
        (name) => nodeNameSet.has(name) || includedGroupNames.has(name) || allowedLiterals.has(name),
      );
      if (usable) {
        includedGroupNames.add(group.name);
        progressed = true;
      }
    }
  }

  return expanded.flatMap((group) => {
    const proxyEntries = uniqueStrings(
      group.proxies.filter(
        (name) => nodeNameSet.has(name) || includedGroupNames.has(name) || allowedLiterals.has(name),
      ),
    );
    if (proxyEntries.length === 0) return [];
    const { filter: _filter, proxies: _proxies, ...rest } = group;
    return [stripUndefined({ ...rest, proxies: proxyEntries }) as RenderedProxyGroup];
  });
}

function expandGroupProxies(group: TemplateProxyGroup, nodeNames: string[]) {
  const entries = group.filter ? findNamesByRegex(nodeNames, group.filter) : [];
  for (const item of group.proxies || []) {
    if (item === "$all") entries.push(...nodeNames);
    else entries.push(item);
  }
  return uniqueStrings(entries);
}

function findNamesByRegex(names: string[], pattern: string) {
  const regex = compileRegex(pattern);
  return names.filter((name) => regex.test(name));
}
