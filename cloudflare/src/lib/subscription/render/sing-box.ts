import { DEFAULT_RULESET_CDN } from "../../defaults";
import type { ProxyNode, RoutingTemplateConfig, TemplateProxyGroup } from "../../../types";
import { TEST_URL, renderTemplateProxyGroups, rulesetCdnOrigin, type RenderedProxyGroup } from "../templates";
import type { BuildOptions } from "../types";
import { numberSetting, stringSetting, stripUndefined, uniqueStrings } from "../utils";
import { toSingBoxNode, type SingBoxNode } from "./sing-box-nodes";
import { renderSingBoxRules, type ConvertedRuleSetSource } from "./sing-box-rules";

const SING_BOX_GROUP_TYPES: Record<string, "selector" | "urltest"> = {
  select: "selector",
  "url-test": "urltest",
  // Clash `fallback` and `load-balance` groups were removed from sing-box 1.13,
  // so they degrade to a selector that keeps the same member order.
  fallback: "selector",
  "load-balance": "selector",
};

const SING_BOX_POLICIES: Record<string, string> = {
  DIRECT: "DIRECT",
  REJECT: "REJECT",
  "REJECT-DROP": "REJECT",
};

type SingBoxGroup = RenderedProxyGroup & { members: string[] };

const SING_BOX_VERSION_PATTERN = /sing-box[/ ]v?(\d+)\.(\d+)/i;
const SING_BOX_HTTP_CLIENTS_MINOR = 14;
const SING_BOX_DNS_SPLIT_MINOR = 14;
const RULE_SET_HTTP_CLIENT_TAG = "rule-set-download";
const CN_RULE_SET_TAG = "geoip-cn";

function singBoxAtLeast(userAgent: string | undefined, minor: number) {
  const match = SING_BOX_VERSION_PATTERN.exec(String(userAgent || ""));
  if (!match) return false;
  const major = Number(match[1]);
  return major > 1 || (major === 1 && Number(match[2]) >= minor);
}

export function singBoxSupportsHttpClients(userAgent: string | undefined) {
  return singBoxAtLeast(userAgent, SING_BOX_HTTP_CLIENTS_MINOR);
}

export function singBoxSupportsDnsSplit(userAgent: string | undefined) {
  return singBoxAtLeast(userAgent, SING_BOX_DNS_SPLIT_MINOR);
}

export function singBoxUsesHttpClients(options: BuildOptions) {
  const override = options.requestUrl?.searchParams.get("singboxHttpClients");
  if (override === "1" || override === "true") return true;
  if (override === "0" || override === "false") return false;
  return singBoxSupportsHttpClients(options.requestUserAgent);
}

type SingBoxRenderOptions = {
  rulesetCdn?: unknown;
  converted?: ConvertedRuleSetSource;
  httpClients?: boolean;
  fakeIp?: boolean;
  dnsSplit?: boolean;
};

// The Mihomo side of the same template resolves through `fake-ip`, so the
// sing-box profile mirrors that mode and only overrides it when the template
// asks for something else (`dns.enhanced-mode: redir-host`). Both ranges are
// emitted: sing-box answers A and AAAA with a fake address, and the tun already
// carries an IPv4 and an IPv6 address, so keeping the IPv6 side costs nothing.
const FAKE_IP_DEFAULT_RANGES = { inet4: "198.18.0.0/15", inet6: "fc00::/18" };

function singBoxFakeIpRanges(config: RoutingTemplateConfig) {
  const dns = (config.dns || {}) as Record<string, unknown>;
  return {
    inet4: stringSetting(dns["fake-ip-range"] ?? dns.fakeIpRange) || FAKE_IP_DEFAULT_RANGES.inet4,
    inet6: stringSetting(dns["fake-ip-range6"] ?? dns.fakeIpRange6) || FAKE_IP_DEFAULT_RANGES.inet6,
  };
}

export function singBoxUsesFakeIp(config: RoutingTemplateConfig, override: string | null | undefined) {
  if (override === "1" || override === "true") return true;
  if (override === "0" || override === "false") return false;
  const dns = (config.dns || {}) as Record<string, unknown>;
  const mode = stringSetting(dns["enhanced-mode"] ?? dns.enhancedMode);
  return !mode || mode === "fake-ip";
}

// IP rules need a resolved address under fake-ip, and the resolver decides how
// those addresses look: `direct` (the default) asks the bootstrap resolver, the
// way Mihomo's own nameserver does, while `proxy` keeps the lookup inside the
// tunnel. `off` drops the action and leaves IP rules matching literal
// addresses only.
function singBoxFakeIpResolveServer(config: RoutingTemplateConfig) {
  const dns = (config.dns || {}) as Record<string, unknown>;
  const value = dns["fake-ip-resolve"] ?? dns.fakeIpResolve;
  if (value === false) return undefined;
  const mode = stringSetting(value) || "direct";
  if (mode === "off" || mode === "none" || mode === "false") return undefined;
  return mode === "proxy" ? "dns-proxy" : "dns-bootstrap";
}

// 1.14+ resolves the query first and answers with the real address when it is
// Chinese, so those connections never enter fake-ip: the client dials a real
// address, the template's IP rules match it natively, and no route-level
// resolve action (with its fatal lookups and IP dialing) is needed. Everything
// else still gets a fake address and is routed by domain. A failed lookup just
// falls through to the fakeip rule, so it can never break a connection.
function singBoxDnsSplitRules(resolveServer: string, cnRuleSetTag: string) {
  return [
    { query_type: ["A", "AAAA"], action: "evaluate", server: resolveServer },
    { query_type: ["A", "AAAA"], match_response: true, rule_set: [cnRuleSetTag], action: "respond" },
    { query_type: ["A", "AAAA"], action: "route", server: "dns-fakeip" },
  ];
}

export function renderSingBoxJson(proxies: ProxyNode[], template?: RoutingTemplateConfig, options: SingBoxRenderOptions = {}) {
  const config = template || {};
  const nodes = proxies.map(toSingBoxNode).filter((node): node is SingBoxNode => Boolean(node));
  const tags = nodes.map((node) => String(node.kind === "outbound" ? node.outbound.tag : node.endpoint.tag));
  if (tags.length === 0) throw new Error("No supported nodes for sing-box output");

  const groups = renderSingBoxGroups(tags, config);
  const policies = new Set([...Object.values(SING_BOX_POLICIES), ...groups.map((group) => String(group.tag))]);
  const cdn = rulesetCdnOrigin(options.rulesetCdn) || DEFAULT_RULESET_CDN;
  const httpClients = Boolean(options.httpClients);
  const fakeIpRanges = options.fakeIp ? singBoxFakeIpRanges(config) : undefined;
  const resolveServer = fakeIpRanges ? singBoxFakeIpResolveServer(config) : undefined;
  // 1.14+ can decide the CN split in the DNS layer (see below), which removes
  // the need for the route-level resolve action and its side effects.
  const splitServer = options.dnsSplit ? resolveServer : undefined;
  const { rules, ruleSets, final, cnRuleSetTag } = renderSingBoxRules(config, policies, groups, cdn, {
    converted: options.converted,
    httpClients,
    resolveServer: splitServer ? undefined : resolveServer,
    cnRuleSetTag: splitServer ? CN_RULE_SET_TAG : undefined,
  });
  const dnsRules = fakeIpRanges
    ? splitServer && cnRuleSetTag
      ? singBoxDnsSplitRules(splitServer, cnRuleSetTag)
      : [{ query_type: ["A", "AAAA"], server: "dns-fakeip" }]
    : undefined;
  const mixedPort = numberSetting(config.mixedPort ?? config["mixed-port"], 7890, 1, 65535);
  const allowLan = Boolean(config.allowLan ?? config["allow-lan"]);

  const outbounds = [
    ...groups,
    ...nodes.flatMap((node) => (node.kind === "outbound" ? [node.outbound] : [])),
    // An empty direct outbound cannot be a detour target ("detour to an empty
    // direct outbound makes no sense"), and the HTTP client below detours to it.
    httpClients ? { type: "direct", tag: "DIRECT", domain_resolver: "dns-bootstrap" } : { type: "direct", tag: "DIRECT" },
    { type: "block", tag: "REJECT" },
  ];
  const endpoints = nodes.flatMap((node) => (node.kind === "endpoint" ? [node.endpoint] : []));

  return JSON.stringify(
    {
      log: { level: "info" },
      dns: {
        servers: [
          { tag: "dns-proxy", type: "tls", server: "1.1.1.1", detour: final === "REJECT" ? "DIRECT" : final },
          { tag: "dns-bootstrap", type: "udp", server: "223.5.5.5" },
          ...(fakeIpRanges
            ? [{ tag: "dns-fakeip", type: "fakeip", inet4_range: fakeIpRanges.inet4, inet6_range: fakeIpRanges.inet6 }]
            : []),
        ],
        // Only A/AAAA are faked: sing-box rejects every other query type on a
        // fakeip server, and those answers (HTTPS, PTR) are real anyway. The
        // fakeip server can never be the default one, so `final` stays put.
        ...(fakeIpRanges ? { rules: dnsRules } : {}),
        final: "dns-proxy",
      },
      ...(httpClients ? { http_clients: [{ tag: RULE_SET_HTTP_CLIENT_TAG, detour: "DIRECT" }] } : {}),
      inbounds: [
        {
          type: "tun",
          tag: "tun-in",
          address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
          auto_route: true,
          strict_route: true,
        },
        { type: "mixed", tag: "mixed-in", listen: allowLan ? "0.0.0.0" : "127.0.0.1", listen_port: mixedPort },
      ],
      ...(endpoints.length > 0 ? { endpoints } : {}),
      outbounds,
      route: {
        auto_detect_interface: true,
        default_domain_resolver: { server: "dns-bootstrap" },
        ...(httpClients ? { default_http_client: RULE_SET_HTTP_CLIENT_TAG } : {}),
        ...(ruleSets.length > 0 ? { rule_set: ruleSets } : {}),
        rules,
        final,
      },
      // Fake addresses are mapped back to their domain through the fakeip
      // store; without the cache file a client restart loses the mapping and
      // sing-box fails the connection with "missing fakeip record".
      ...(fakeIpRanges
        ? { experimental: { cache_file: { enabled: true, path: "cache.db", store_fakeip: true } } }
        : {}),
    },
    null,
    2,
  );
}

function renderSingBoxGroups(nodeTags: string[], config: RoutingTemplateConfig): Array<Record<string, unknown>> {
  const groupTemplates = config.proxyGroups || config["proxy-groups"];
  if (!groupTemplates || groupTemplates.length === 0) return defaultSingBoxGroups(nodeTags);

  let groups = singBoxGroupCandidates(nodeTags, groupTemplates, new Set(nodeTags));
  // Dropping a group also invalidates members that reference it, so repeat
  // until the surviving groups stop shrinking.
  for (let pass = 0; pass < groupTemplates.length + 1; pass += 1) {
    const available = new Set([...nodeTags, ...groups.map((group) => String(group.name))]);
    const next = singBoxGroupCandidates(nodeTags, groupTemplates, available);
    if (JSON.stringify(next) === JSON.stringify(groups)) break;
    groups = next;
  }
  if (groups.length === 0) return defaultSingBoxGroups(nodeTags);

  return groups.map((group) => {
    const type = SING_BOX_GROUP_TYPES[String(group.type)] || "selector";
    return stripUndefined({
      type,
      tag: group.name,
      outbounds: group.members,
      default: type === "selector" ? group.members[0] : undefined,
      url: type === "urltest" ? stringSetting(group.url) || TEST_URL : undefined,
      interval: type === "urltest" ? singBoxInterval(group.interval) : undefined,
      tolerance: type === "urltest" ? numberSetting(group.tolerance, 50, 1, 60000) : undefined,
      interrupt_exist_connections: false,
    });
  });
}

function singBoxGroupCandidates(nodeTags: string[], groupTemplates: TemplateProxyGroup[], availableTags: Set<string>): SingBoxGroup[] {
  return renderTemplateProxyGroups(nodeTags, groupTemplates)
    .map((group) => ({ ...group, members: singBoxGroupMembers(group.proxies, availableTags) }))
    .filter((group) => group.members.length > 0);
}

function singBoxGroupMembers(members: string[], availableTags: Set<string>) {
  return uniqueStrings(
    members.flatMap((member) => {
      if (SING_BOX_POLICIES[member]) return [SING_BOX_POLICIES[member]];
      // `PASS` and dangling references have no sing-box outbound.
      return availableTags.has(member) ? [member] : [];
    }),
  );
}

function defaultSingBoxGroups(nodeTags: string[]): Array<Record<string, unknown>> {
  return [
    {
      type: "selector",
      tag: "PROXY",
      outbounds: ["AUTO", ...nodeTags],
      default: "AUTO",
      interrupt_exist_connections: false,
    },
    {
      type: "urltest",
      tag: "AUTO",
      outbounds: nodeTags,
      url: TEST_URL,
      interval: "5m",
      tolerance: 50,
      interrupt_exist_connections: false,
    },
  ];
}

function singBoxInterval(value: unknown) {
  const text = stringSetting(value);
  if (text) return /^\d+$/.test(text) ? `${text}s` : text;
  return `${numberSetting(value, 300, 1, 86400)}s`;
}

// Rule providers that come from MetaCubeX/meta-rules-dat have a sing-box twin
// on the `sing` branch, so `RULE-SET` rules can become real rule sets instead
