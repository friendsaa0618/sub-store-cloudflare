import type { RoutingTemplateConfig } from "../../../types";
import type { BuildOptions } from "../types";
import { stringSetting } from "../utils";

// Rule providers that come from MetaCubeX/meta-rules-dat have a sing-box twin
// on the `sing` branch, so `RULE-SET` rules can become real rule sets instead
// of being dropped.
const META_PROVIDER_URL = /^https:\/\/[^/]+\/gh\/MetaCubeX\/meta-rules-dat@meta\/geo\/(geosite|geoip)\/(.+)\.mrs$/;

type SingBoxRuleSet = {
  tag: string;
  type: "remote";
  format: "binary" | "source";
  url: string;
  update_interval: string;
  download_detour?: string;
};

// Clash providers that are not MetaCubeX lists (Loyalsoldier, custom URLs) are
// served from the Worker after conversion, see /download/collection/<id>/ruleset.
export type ConvertedRuleSetSource = { base: string; token: string };

const SING_BOX_RULE_FIELDS: Record<string, string> = {
  DOMAIN: "domain",
  "DOMAIN-SUFFIX": "domain_suffix",
  "DOMAIN-KEYWORD": "domain_keyword",
  "DOMAIN-REGEX": "domain_regex",
  "IP-CIDR": "ip_cidr",
  "IP-CIDR6": "ip_cidr",
  "SRC-IP-CIDR": "source_ip_cidr",
  "DST-PORT": "port",
  "SRC-PORT": "source_port",
  "PROCESS-NAME": "process_name",
  "PROCESS-PATH": "process_path",
};

function ruleHasNoResolve(parts: string[]) {
  return parts.slice(3).some((part) => part.toLowerCase() === "no-resolve");
}

export function convertedRuleSetSource(options: BuildOptions): ConvertedRuleSetSource | undefined {
  const collectionId = options.collection?.id;
  const requestUrl = options.requestUrl;
  if (!collectionId || !requestUrl) return undefined;
  const token = requestUrl.searchParams.get("token")
    || requestUrl.pathname.split("/").filter(Boolean)[4]
    || "";
  if (!token) return undefined;
  return {
    base: `${requestUrl.origin}/download/collection/${encodeURIComponent(collectionId)}/ruleset`,
    token,
  };
}

// sing-box 1.14 deprecated the per-rule-set `download_detour` field and the
// implicit HTTP client; the replacement (`http_clients` +
// `route.default_http_client`) is rejected by 1.12/1.13 as unknown fields, so
// the profile has to follow the client's version. The same 1.14 core also
// gained `evaluate` / `respond` DNS rule actions, which the fake-ip CN split
// below uses. The Apple and Android clients send `<app> (sing-box <core
// version>; language <locale>)`, and `?singboxHttpClients=1|0` overrides the

function metaRulesetTarget(url: unknown) {
  const match = META_PROVIDER_URL.exec(stringSetting(url));
  return match ? { kind: match[1], name: match[2] } : undefined;
}

function singBoxRuleOutcome(tags: string[], policy: string) {
  return policy === "REJECT" ? { rule_set: tags, action: "reject" } : { rule_set: tags, outbound: policy };
}

type SingBoxRulesOptions = {
  converted?: ConvertedRuleSetSource;
  httpClients?: boolean;
  resolveServer?: string;
  cnRuleSetTag?: string;
};

export function renderSingBoxRules(
  config: RoutingTemplateConfig,
  policies: Set<string>,
  groups: Array<Record<string, unknown>>,
  cdn: string,
  options: SingBoxRulesOptions = {},
) {
  const rules: Array<Record<string, unknown>> = [{ action: "sniff" }, { protocol: "dns", action: "hijack-dns" }];
  const ruleSets = new Map<string, SingBoxRuleSet>();
  const providers = (config.ruleProviders || config["rule-providers"] || {}) as Record<string, { url?: unknown; behavior?: unknown }>;
  const remoteRuleSet = (key: string, tag: string, format: "binary" | "source", url: string) => {
    let entry = ruleSets.get(key);
    if (!entry) {
      entry = {
        tag,
        type: "remote",
        format,
        url,
        update_interval: "1d",
        // sing-box 1.12/1.13 have no `http_clients`, and the implicit client
        // downloads through the default outbound: the profile would fail to
        // start whenever the proxy is down. 1.14+ takes the shared HTTP client
        // configured on the route instead, which also silences the deprecation
        // warning for this field.
        ...(options.httpClients ? {} : { download_detour: "DIRECT" }),
      };
      ruleSets.set(key, entry);
    }
    return entry;
  };
  const ruleSetFor = (kind: string, name: string, tag: string) =>
    remoteRuleSet(`${kind}/${name}`, tag, "binary", `${cdn}/gh/MetaCubeX/meta-rules-dat@sing/geo/${kind}/${name}.srs`);
  const convertedRuleSetFor = (provider: { url?: unknown } | undefined, tag: string) => {
    if (!options.converted || !stringSetting(provider?.url)) return undefined;
    return remoteRuleSet(`converted/${tag}`, tag, "source",
      `${options.converted.base}/${encodeURIComponent(tag)}?token=${encodeURIComponent(options.converted.token)}`);
  };

  let final = "";
  // The DNS split needs a CN IP rule set; reuse the one the template already
  // points at (`GEOIP,CN` or a MetaCubeX `geoip/cn` provider) when it exists.
  let cnRuleSetTag = "";
  // Fake-ip destinations are restored to their domain before rule matching, so
  // IP rules would only ever match literal addresses. A `resolve` action in
  // front of the first IP-based rule restores them: the rule then matches the
  // resolved addresses and sing-box dials them (the answer is cached).
  let ipRulesResolved = !options.resolveServer;
  const ensureIpResolve = (parts: string[], ipBased: boolean) => {
    if (ipRulesResolved || !ipBased || ruleHasNoResolve(parts)) return;
    ipRulesResolved = true;
    rules.push({ action: "resolve", server: options.resolveServer });
  };
  for (const rule of config.rules || []) {
    const parts = String(rule).split(",").map((part) => part.trim());
    const type = (parts[0] || "").toUpperCase();
    if (type === "MATCH") {
      if (policies.has(parts[1])) final = parts[1];
      break;
    }
    if (type === "RULE-SET") {
      if (!policies.has(parts[2])) continue;
      const provider = providers[parts[1]];
      const target = metaRulesetTarget(provider?.url);
      const set = target ? ruleSetFor(target.kind, target.name, parts[1]) : convertedRuleSetFor(provider, parts[1]);
      if (set) {
        if (target?.kind === "geoip" && target.name === "cn") cnRuleSetTag = cnRuleSetTag || set.tag;
        ensureIpResolve(parts, target?.kind === "geoip" || stringSetting(provider?.behavior) === "ipcidr");
        rules.push(singBoxRuleOutcome([set.tag], parts[2]));
      }
      continue;
    }
    if (type === "GEOIP") {
      // Only ISO country codes: MetaCubeX publishes one rule set per country,
      // and a missing file makes sing-box refuse to start.
      const country = (parts[1] || "").toLowerCase();
      if (!/^[a-z]{2}$/.test(country) || !policies.has(parts[2])) continue;
      ensureIpResolve(parts, true);
      rules.push(singBoxRuleOutcome([ruleSetFor("geoip", country, `geoip-${country}`).tag], parts[2]));
      continue;
    }
    const field = SING_BOX_RULE_FIELDS[type];
    if (!field || !parts[1] || !policies.has(parts[2])) continue;
    ensureIpResolve(parts, field === "ip_cidr");
    rules.push({ [field]: [parts[1]], outbound: parts[2] });
  }
  // Rule types such as GEOSITE/SCRIPT/IP-ASN are skipped instead of emitting
  // rules the client cannot load.
  if (options.cnRuleSetTag && !cnRuleSetTag) {
    // The DNS split matches the evaluated answer against a CN IP rule set, so
    // make sure one exists even when the template never referenced `GEOIP,CN`.
    cnRuleSetTag = ruleSetFor("geoip", "cn", options.cnRuleSetTag).tag;
  }
  return {
    rules,
    ruleSets: [...ruleSets.values()],
    final: final || String(groups[0]?.tag || "PROXY"),
    cnRuleSetTag: options.cnRuleSetTag ? cnRuleSetTag : undefined,
  };
}
