import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { BUILTIN_TEMPLATES } from "../src/lib/defaults";
import {
  MAX_REMOTE_SOURCE_RESPONSE_BYTES,
  MAX_REMOTE_SOURCE_URLS,
} from "../src/lib/limits";
import { readResponseText } from "../src/lib/read";
import { buildSubscription, buildSubscriptionResult, convertSubscriptionContent, normalizeTargetAlias, singBoxSupportsDnsSplit, singBoxSupportsHttpClients, validateSubscriptionContent } from "../src/lib/subscription";

describe("subscription parsing and limits", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes target aliases and parses URI subscriptions", () => {
    expect(normalizeTargetAlias("clash-meta")).toBe("mihomo");
    expect(normalizeTargetAlias("singbox")).toBe("sing-box");
    expect(normalizeTargetAlias("surge-mac")).toBe("surge-mac");
    const nodes = validateSubscriptionContent(
      "vless://00000000-0000-4000-8000-000000000002@example.com:443?security=tls#Parsed%20Node",
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe("Parsed Node");
  });

  it("renders every advertised target", async () => {
    const targets = ["mihomo", "stash", "surge", "surge-mac", "surfboard", "loon", "egern", "shadowrocket", "qx", "sing-box", "v2ray", "uri", "json"] as const;
    for (const target of targets) {
      const output = await buildSubscription({
        source: {
          id: "target-smoke",
          name: "Target Smoke",
          type: "local",
          url: "",
          content: "trojan://password@example.com:443?sni=example.com#Target%20Node",
        },
        sources: [],
        requestUrl: new URL(`https://example.com/download/source/target-smoke/${target}`),
        target,
      });
      expect(output.length, `${target} output`).toBeGreaterThan(0);
    }
  });

  it("renders a sing-box profile without legacy inbound fields or WireGuard outbounds", async () => {
    const output = await buildSubscription({
      source: {
        id: "sing-box-modern",
        name: "Sing Box Modern",
        type: "local",
        url: "",
        content: [
          "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
          "wireguard://YNXtAzepDqRv9H52osJVDQnznT5AM11eCK3ESpwSt04%3D@wg.example.com:51820?ip=10.0.0.2&ipv6=fd00%3A%3A2&public-key=Z1XXLsKYkYxuiYjJIkRvtIKFepCYHTgON%2BGwPq7SOV4%3D&reserved=1%2C2%2C3#WireGuard%20Node",
        ].join("\n"),
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/sing-box-modern/sing-box"),
      target: "sing-box",
    });
    const config = JSON.parse(output) as {
      dns: Record<string, unknown>;
      inbounds: Array<Record<string, unknown>>;
      endpoints?: Array<Record<string, unknown>>;
      outbounds: Array<Record<string, unknown> & { tag?: string; outbounds?: string[] }>;
      route: { rules: Array<Record<string, unknown>>; default_domain_resolver?: Record<string, unknown> };
    };
    // A tun inbound is what turns the profile into a system-wide VPN; without
    // it iOS/Android clients only run a local proxy and never show the VPN
    // indicator.
    expect(config.inbounds).toEqual([
      {
        type: "tun",
        tag: "tun-in",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        auto_route: true,
        strict_route: true,
      },
      { type: "mixed", tag: "mixed-in", listen: "127.0.0.1", listen_port: 7890 },
    ]);
    expect(config.dns).toEqual({
      servers: [
        { tag: "dns-proxy", type: "tls", server: "1.1.1.1", detour: "PROXY" },
        { tag: "dns-bootstrap", type: "udp", server: "223.5.5.5" },
        // The Mihomo side of a template resolves through fake-ip, so the
        // sing-box profile mirrors that mode by default.
        { tag: "dns-fakeip", type: "fakeip", inet4_range: "198.18.0.0/15", inet6_range: "fc00::/18" },
      ],
      rules: [{ query_type: ["A", "AAAA"], server: "dns-fakeip" }],
      final: "dns-proxy",
    });
    expect(config.route.rules).toEqual([{ action: "sniff" }, { protocol: "dns", action: "hijack-dns" }]);
    expect(config.route.default_domain_resolver).toEqual({ server: "dns-bootstrap" });
    expect(config.outbounds.some((outbound) => outbound.type === "wireguard")).toBe(false);
    expect(config.endpoints).toHaveLength(1);
    expect(config.endpoints?.[0]).toMatchObject({
      type: "wireguard",
      tag: "WireGuard Node",
      address: ["10.0.0.2/32", "fd00::2/128"],
      peers: [{
        address: "wg.example.com",
        port: 51820,
        public_key: "Z1XXLsKYkYxuiYjJIkRvtIKFepCYHTgON+GwPq7SOV4=",
        allowed_ips: ["0.0.0.0/0", "::/0"],
        reserved: [1, 2, 3],
      }],
    });
    expect(config.outbounds.find((outbound) => outbound.tag === "PROXY")?.outbounds).toEqual(["AUTO", "Trojan Node", "WireGuard Node"]);
    expect(config.outbounds.find((outbound) => outbound.tag === "AUTO")?.outbounds).toEqual(["Trojan Node", "WireGuard Node"]);
  });

  it("mirrors the routing template groups and rules in the sing-box profile", async () => {
    const output = await buildSubscription({
      source: {
        id: "sing-box-template",
        name: "Sing Box Template",
        type: "local",
        url: "",
        content: [
          "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
          "wireguard://YNXtAzepDqRv9H52osJVDQnznT5AM11eCK3ESpwSt04%3D@wg.example.com:51820?ip=10.0.0.2&ipv6=fd00%3A%3A2&public-key=Z1XXLsKYkYxuiYjJIkRvtIKFepCYHTgON%2BGwPq7SOV4%3D&reserved=1%2C2%2C3#WireGuard%20Node",
        ].join("\n"),
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/collection/sing-box-template/sing-box"),
      target: "sing-box",
      template: {
        id: "template-sync",
        name: "Template Sync",
        target: "mihomo",
        config: {
          mixedPort: 7897,
          allowLan: true,
          proxyGroups: [
            { name: "🚀 节点选择", type: "select", proxies: ["♻️ 自动选择", "DIRECT"] },
            { name: "♻️ 自动选择", type: "url-test", filter: "Trojan|WireGuard", interval: 600, tolerance: 80 },
            { name: "🧪 备用", type: "fallback", proxies: ["♻️ 自动选择", "PASS", "Missing Group"] },
            { name: "🗑️ 空组", type: "select", proxies: ["PASS"] },
          ],
          rules: [
            "DOMAIN-SUFFIX,openai.com,🚀 节点选择",
            "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
            "RULE-SET,ProxyGFWlist,🚀 节点选择",
            "GEOIP,CN,DIRECT",
            "MATCH,🚀 节点选择",
          ],
        },
      },
    });
    const config = JSON.parse(output) as {
      dns: { servers: Array<Record<string, unknown>> };
      inbounds: Array<Record<string, unknown>>;
      outbounds: Array<Record<string, unknown> & { type: string; tag?: string }>;
      route: { rules: Array<Record<string, unknown>>; rule_set?: Array<Record<string, unknown>>; final?: string };
    };
    // The collection template now drives the sing-box profile, so the client
    // shows the same groups as the Mihomo link instead of PROXY/AUTO.
    expect(config.outbounds.filter((outbound) => ["selector", "urltest"].includes(outbound.type))).toEqual([
      {
        type: "selector",
        tag: "🚀 节点选择",
        outbounds: ["♻️ 自动选择", "DIRECT"],
        default: "♻️ 自动选择",
        interrupt_exist_connections: false,
      },
      {
        type: "urltest",
        tag: "♻️ 自动选择",
        outbounds: ["Trojan Node", "WireGuard Node"],
        url: "https://www.gstatic.com/generate_204",
        interval: "600s",
        tolerance: 80,
        interrupt_exist_connections: false,
      },
      {
        type: "selector",
        tag: "🧪 备用",
        outbounds: ["♻️ 自动选择"],
        default: "♻️ 自动选择",
        interrupt_exist_connections: false,
      },
    ]);
    expect(config.outbounds.some((outbound) => outbound.tag === "PROXY" || outbound.tag === "AUTO")).toBe(false);
    expect(config.inbounds[1]).toEqual({ type: "mixed", tag: "mixed-in", listen: "0.0.0.0", listen_port: 7897 });
    expect(config.route.rules).toEqual([
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" },
      { domain_suffix: ["openai.com"], outbound: "🚀 节点选择" },
      { ip_cidr: ["10.0.0.0/8"], outbound: "DIRECT" },
      // `IP-CIDR,...,no-resolve` never asks for a resolved address, but the
      // `GEOIP,CN` rule below does, so a `resolve` action lands in front of it:
      // with fake-ip the destination is a domain by then.
      { action: "resolve", server: "dns-bootstrap" },
      // `GEOIP,CN` has a MetaCubeX twin even when the template has no provider
      // for it; the provider-less `RULE-SET` above is skipped.
      { rule_set: ["geoip-cn"], outbound: "DIRECT" },
    ]);
    expect(config.route.rule_set).toEqual([
      {
        tag: "geoip-cn",
        type: "remote",
        format: "binary",
        url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip/cn.srs",
        update_interval: "1d",
        download_detour: "DIRECT",
      },
    ]);
    expect(config.route.final).toBe("🚀 节点选择");
    expect(config.dns.servers[0]).toEqual({ tag: "dns-proxy", type: "tls", server: "1.1.1.1", detour: "🚀 节点选择" });
  });

  it("maps the built-in MetaCubeX providers onto sing-box rule sets", async () => {
    const template = BUILTIN_TEMPLATES.find((entry) => entry.id === "acl4ssr-mihomo");
    expect(template).toBeDefined();
    const output = await buildSubscription({
      source: {
        id: "sing-box-parity",
        name: "Sing Box Parity",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/collection/sing-box-parity/sing-box"),
      target: "sing-box",
      template: { id: template?.id, name: template?.name, target: "mihomo", config: template?.config || {} },
    });
    const config = JSON.parse(output) as {
      outbounds: Array<Record<string, unknown> & { type: string; tag?: string }>;
      route: {
        final?: string;
        rules: Array<Record<string, unknown>>;
        rule_set?: Array<{ tag: string; url: string; format?: string; download_detour?: string }>;
      };
    };
    const groupNames = (template?.config.proxyGroups || []).map((group) => group.name);
    expect(config.outbounds.filter((outbound) => ["selector", "urltest"].includes(outbound.type)).map((outbound) => outbound.tag))
      .toEqual(groupNames);

    // Every MetaCubeX provider becomes a remote `.srs` rule set on the `sing`
    // branch, and `GEOIP,CN` maps to the matching country rule set.
    const ruleSets = config.route.rule_set || [];
    const urls = new Map(ruleSets.map((entry) => [entry.tag, entry.url]));
    // 17 providers, but `ChinaIP` and `GEOIP,CN` share `geoip/cn.srs`, so the
    // rule set is emitted once.
    expect(ruleSets.length).toBe(16);
    expect(ruleSets.every((entry) => entry.format === "binary" && entry.download_detour === "DIRECT")).toBe(true);
    expect(urls.get("Ads")).toBe("https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/category-ads-all.srs");
    expect(urls.get("GFW")).toBe("https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/gfw.srs");
    expect(urls.get("SteamCN")).toBe("https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/steam@cn.srs");
    expect(urls.get("ChinaIP")).toBe("https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip/cn.srs");

    expect(config.route.rules).toContainEqual({ rule_set: ["Ads"], outbound: "🛑 全球拦截" });
    expect(config.route.rules).toContainEqual({ rule_set: ["Microsoft"], outbound: "Ⓜ️ 微软服务" });
    expect(config.route.rules).toContainEqual({ rule_set: ["ChinaDomain"], outbound: "DIRECT" });
    expect(config.route.rules).toContainEqual({ rule_set: ["ChinaIP"], outbound: "🎯 全球直连" });
    expect(config.route.final).toBe("🐟 漏网之鱼");
  });

  it("turns a REJECT policy on a MetaCubeX provider into a reject action", async () => {
    const output = await buildSubscription({
      source: {
        id: "sing-box-reject",
        name: "Sing Box Reject",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/collection/sing-box-reject/sing-box"),
      target: "sing-box",
      template: {
        id: "reject",
        name: "Reject",
        target: "mihomo",
        config: {
          proxyGroups: [{ name: "🚀 节点选择", type: "select", proxies: ["$all"] }],
          ruleProviders: {
            Ads: {
              type: "http",
              behavior: "domain",
              format: "mrs",
              url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ads-all.mrs",
              path: "./ruleset/geosite-category-ads-all.mrs",
              interval: 86400,
            },
          },
          rules: ["RULE-SET,Ads,REJECT", "MATCH,🚀 节点选择"],
        },
      },
    });
    const config = JSON.parse(output) as { route: { rules: Array<Record<string, unknown>> } };
    expect(config.route.rules).toContainEqual({ rule_set: ["Ads"], action: "reject" });
  });

  it("converts non-MetaCubeX providers through the Worker rule-set route", async () => {
    const template = BUILTIN_TEMPLATES.find((entry) => entry.id === "loyalsoldier-whitelist");
    expect(template).toBeDefined();
    const source = {
      id: "sing-box-loyalsoldier",
      name: "Sing Box Loyalsoldier",
      type: "local" as const,
      url: "",
      content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
    };
    const output = await buildSubscription({
      source,
      collection: { id: "daily", name: "Daily", sourceIds: [], templateId: "loyalsoldier-whitelist" },
      sources: [source],
      requestUrl: new URL("https://sub.example.com/download/collection/daily/sing-box/test-download-token"),
      target: "sing-box",
      template: { id: template?.id, name: template?.name, target: "mihomo", config: template?.config || {} },
    });
    const config = JSON.parse(output) as {
      route: {
        rules: Array<Record<string, unknown>>;
        rule_set?: Array<Record<string, unknown>>;
        final?: string;
      };
    };
    // Every Loyalsoldier provider is served by the Worker in the sing-box source
    // format, because sing-box cannot read Clash payload lists; `GEOIP,CN` adds
    // the MetaCubeX country rule set on top.
    const ruleSets = config.route.rule_set || [];
    expect(ruleSets.length).toBe(15);
    expect(ruleSets.find((entry) => entry.tag === "geoip-cn")).toEqual({
      tag: "geoip-cn",
      type: "remote",
      format: "binary",
      url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip/cn.srs",
      update_interval: "1d",
      download_detour: "DIRECT",
    });
    expect(ruleSets.find((entry) => entry.tag === "reject")).toEqual({
      tag: "reject",
      type: "remote",
      format: "source",
      url: "https://sub.example.com/download/collection/daily/ruleset/reject?token=test-download-token",
      update_interval: "1d",
      download_detour: "DIRECT",
    });
    expect(config.route.rules).toContainEqual({ rule_set: ["reject"], outbound: "🛑 全球拦截" });
    expect(config.route.rules).toContainEqual({ rule_set: ["cncidr"], outbound: "DIRECT" });
    expect(config.route.final).toBe("🚀 节点选择");
  });

  it("switches to the shared HTTP client on sing-box 1.14+ cores", async () => {
    const template = BUILTIN_TEMPLATES.find((entry) => entry.id === "loyalsoldier-whitelist");
    expect(template).toBeDefined();
    const source = {
      id: "sing-box-http-clients",
      name: "Sing Box HTTP Clients",
      type: "local" as const,
      url: "",
      content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
    };
    const build = (userAgent: string | undefined, query = "") => buildSubscription({
      source,
      collection: { id: "daily", name: "Daily", sourceIds: [], templateId: "loyalsoldier-whitelist" },
      sources: [source],
      requestUrl: new URL(`https://sub.example.com/download/collection/daily/sing-box/test-download-token${query}`),
      target: "sing-box",
      template: { id: template?.id, name: template?.name, target: "mihomo", config: template?.config || {} },
      requestUserAgent: userAgent,
    });
    type Profile = {
      http_clients?: Array<Record<string, unknown>>;
      outbounds: Array<Record<string, unknown> & { type: string; tag?: string }>;
      route: {
        default_http_client?: string;
        rule_set?: Array<Record<string, unknown>>;
      };
    };

    // 1.14 deprecated `download_detour` and the implicit HTTP client; the
    // profile has to move to `http_clients` + `route.default_http_client`, or
    // the client shows a migration warning on every start.
    const modern = JSON.parse(await build("SFI (sing-box 1.14.2; language zh_CN)")) as Profile;
    expect(modern.http_clients).toEqual([{ tag: "rule-set-download", detour: "DIRECT" }]);
    expect(modern.route.default_http_client).toBe("rule-set-download");
    // The detour target must not be an empty direct outbound, so it carries a
    // resolver for the rule-set host names.
    expect(modern.outbounds.find((outbound) => outbound.tag === "DIRECT"))
      .toEqual({ type: "direct", tag: "DIRECT", domain_resolver: "dns-bootstrap" });
    expect(modern.route.rule_set?.length).toBe(15);
    expect(modern.route.rule_set?.every((entry) => entry.download_detour === undefined)).toBe(true);

    // 1.12/1.13 reject `http_clients` as an unknown field, so the older form
    // stays in place for them and for clients that hide their version.
    for (const userAgent of ["SFA (sing-box 1.13.0; language zh_CN)", undefined, "Clash.Meta/v1.19.31"]) {
      const legacy = JSON.parse(await build(userAgent)) as Profile;
      expect(legacy.http_clients, `http_clients for ${userAgent}`).toBeUndefined();
      expect(legacy.route.default_http_client).toBeUndefined();
      expect(legacy.outbounds.find((outbound) => outbound.tag === "DIRECT"))
        .toEqual({ type: "direct", tag: "DIRECT" });
      expect(legacy.route.rule_set?.every((entry) => entry.download_detour === "DIRECT")).toBe(true);
    }

    // `?singboxHttpClients=` covers clients that report a version the
    // detection cannot read (for example a rewritten User-Agent).
    const forcedOff = JSON.parse(await build("SFI (sing-box 1.15.0; language zh_CN)", "?singboxHttpClients=0")) as Profile;
    expect(forcedOff.http_clients).toBeUndefined();
    expect(forcedOff.route.rule_set?.every((entry) => entry.download_detour === "DIRECT")).toBe(true);
    const forcedOn = JSON.parse(await build("SFI (sing-box 1.13.0; language zh_CN)", "?singboxHttpClients=1")) as Profile;
    expect(forcedOn.http_clients).toEqual([{ tag: "rule-set-download", detour: "DIRECT" }]);
    expect(forcedOn.route.rule_set?.every((entry) => entry.download_detour === undefined)).toBe(true);
  });

  it("mirrors the template fake-ip mode as a dual-stack fakeip server", async () => {
    const source = {
      id: "sing-box-fakeip",
      name: "Sing Box FakeIP",
      type: "local" as const,
      url: "",
      content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
    };
    const profile = async (dns: Record<string, unknown> | undefined, query = "") => {
      const output = await buildSubscription({
        source,
        sources: [],
        requestUrl: new URL(`https://example.com/download/collection/sing-box-fakeip/sing-box${query}`),
        target: "sing-box",
        template: { id: "fakeip", name: "FakeIP", target: "mihomo", config: dns ? { dns } : {} },
      });
      return JSON.parse(output) as {
        dns: { servers: Array<Record<string, unknown>>; rules?: Array<Record<string, unknown>>; final?: string };
        experimental?: Record<string, unknown>;
        route: { default_domain_resolver?: Record<string, unknown>; rules: Array<Record<string, unknown>> };
      };
    };

    // The Mihomo side of a template resolves through fake-ip, so sing-box
    // mirrors that mode with both address families: A and AAAA are answered
    // with a fake address and the tun already routes both.
    const fakeIp = await profile(undefined);
    expect(fakeIp.dns.servers.at(-1)).toEqual({
      tag: "dns-fakeip",
      type: "fakeip",
      inet4_range: "198.18.0.0/15",
      inet6_range: "fc00::/18",
    });
    // Only A/AAAA go to fakeip; the fakeip server can never be the default one.
    expect(fakeIp.dns.rules).toEqual([{ query_type: ["A", "AAAA"], server: "dns-fakeip" }]);
    expect(fakeIp.dns.final).toBe("dns-proxy");
    // The mapping survives a client restart only with the cache file.
    expect(fakeIp.experimental).toEqual({ cache_file: { enabled: true, path: "cache.db", store_fakeip: true } });
    // Node and rule-set host names are resolved by the bootstrap resolver, not
    // by fakeip, or the outbound would dial a fake address.
    expect(fakeIp.route.default_domain_resolver).toEqual({ server: "dns-bootstrap" });
    expect(fakeIp.route.rules.some((rule) => JSON.stringify(rule).includes("198.18.0.0/15"))).toBe(false);

    // A template that asks for another DNS mode keeps the plain resolvers.
    const redirHost = await profile({ "enhanced-mode": "redir-host" });
    expect(redirHost.dns.servers).toHaveLength(2);
    expect(redirHost.dns.rules).toBeUndefined();
    expect(redirHost.experimental).toBeUndefined();

    // Mihomo's `fake-ip-range` / `fake-ip-range6` select the pools.
    const custom = await profile({ "enhanced-mode": "fake-ip", "fake-ip-range": "198.19.0.0/16", "fake-ip-range6": "fd00::/18" });
    expect(custom.dns.servers.at(-1)).toEqual({
      tag: "dns-fakeip",
      type: "fakeip",
      inet4_range: "198.19.0.0/16",
      inet6_range: "fd00::/18",
    });

    // `?singboxFakeIp=` overrides the template either way.
    expect((await profile(undefined, "?singboxFakeIp=0")).dns.servers).toHaveLength(2);
    expect((await profile({ "enhanced-mode": "redir-host" }, "?singboxFakeIp=1")).dns.servers.at(-1))
      .toMatchObject({ type: "fakeip" });
  });

  it("resolves destination addresses in front of the IP rules under fake-ip", async () => {
    const source = {
      id: "sing-box-resolve",
      name: "Sing Box Resolve",
      type: "local" as const,
      url: "",
      content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
    };
    const rules = async (config: Record<string, unknown>) => {
      const output = await buildSubscription({
        source,
        sources: [],
        requestUrl: new URL("https://example.com/download/collection/sing-box-resolve/sing-box"),
        target: "sing-box",
        template: { id: "resolve", name: "Resolve", target: "mihomo", config },
      });
      return (JSON.parse(output) as { route: { rules: Array<Record<string, unknown>> } }).route.rules;
    };
    const providers = {
      ChinaIP: { type: "http", behavior: "ipcidr", format: "mrs", url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/cn.mrs", path: "./ruleset/geoip-cn.mrs", interval: 86400 },
      ChinaDomain: { type: "http", behavior: "domain", format: "mrs", url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/cn.mrs", path: "./ruleset/geosite-cn.mrs", interval: 86400 },
    };
    const groups = [{ name: "🚀 节点选择", type: "select", proxies: ["$all"] }];

    // Fake-ip restores the domain before matching, so an ipcidr rule set needs
    // a `resolve` action in front of it to see the real addresses.
    const ipBased = await rules({
      proxyGroups: groups,
      ruleProviders: providers,
      rules: ["RULE-SET,ChinaDomain,DIRECT", "RULE-SET,ChinaIP,DIRECT", "MATCH,🚀 节点选择"],
    });
    expect(ipBased).toEqual([
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" },
      { rule_set: ["ChinaDomain"], outbound: "DIRECT" },
      { action: "resolve", server: "dns-bootstrap" },
      { rule_set: ["ChinaIP"], outbound: "DIRECT" },
    ]);

    // A `no-resolve` rule means literal addresses only, so it asks for nothing
    // and the resolve action moves behind it.
    const noResolve = await rules({
      proxyGroups: groups,
      ruleProviders: providers,
      rules: ["IP-CIDR,10.0.0.0/8,DIRECT,no-resolve", "RULE-SET,ChinaIP,DIRECT", "MATCH,🚀 节点选择"],
    });
    expect(noResolve).toEqual([
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" },
      { ip_cidr: ["10.0.0.0/8"], outbound: "DIRECT" },
      { action: "resolve", server: "dns-bootstrap" },
      { rule_set: ["ChinaIP"], outbound: "DIRECT" },
    ]);

    // Domain-only templates do not need the extra lookup, and without fake-ip
    // the destination is a real address anyway.
    const domainOnly = await rules({
      proxyGroups: groups,
      ruleProviders: providers,
      rules: ["RULE-SET,ChinaDomain,DIRECT", "MATCH,🚀 节点选择"],
    });
    expect(domainOnly.some((rule) => rule.action === "resolve")).toBe(false);
    const noFakeIp = await rules({
      dns: { "enhanced-mode": "redir-host" },
      proxyGroups: groups,
      ruleProviders: providers,
      rules: ["RULE-SET,ChinaIP,DIRECT", "MATCH,🚀 节点选择"],
    });
    expect(noFakeIp.some((rule) => rule.action === "resolve")).toBe(false);

    // `fake-ip-resolve` picks the resolver (or drops the action entirely).
    const ipRules = ["RULE-SET,ChinaIP,DIRECT", "MATCH,🚀 节点选择"];
    const viaProxy = await rules({ dns: { "fake-ip-resolve": "proxy" }, proxyGroups: groups, ruleProviders: providers, rules: ipRules });
    expect(viaProxy.find((rule) => rule.action === "resolve")).toEqual({ action: "resolve", server: "dns-proxy" });
    for (const off of ["off", false]) {
      const disabled = await rules({ dns: { "fake-ip-resolve": off }, proxyGroups: groups, ruleProviders: providers, rules: ipRules });
      expect(disabled.some((rule) => rule.action === "resolve"), `fake-ip-resolve: ${String(off)}`).toBe(false);
    }
  });

  it("splits Chinese answers out of fake-ip on sing-box 1.14+", async () => {
    const source = {
      id: "sing-box-split",
      name: "Sing Box Split",
      type: "local" as const,
      url: "",
      content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
    };
    const template = {
      proxyGroups: [{ name: "🚀 节点选择", type: "select", proxies: ["$all"] }],
      ruleProviders: {
        ChinaIP: { type: "http", behavior: "ipcidr", format: "mrs", url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/cn.mrs", path: "./ruleset/geoip-cn.mrs", interval: 86400 },
      },
      rules: ["RULE-SET,ChinaIP,DIRECT", "MATCH,🚀 节点选择"],
    };
    const profile = async (userAgent: string | undefined, config: Record<string, unknown> = template, query = "") => {
      const output = await buildSubscription({
        source,
        sources: [],
        requestUrl: new URL(`https://example.com/download/collection/sing-box-split/sing-box${query}`),
        target: "sing-box",
        template: { id: "split", name: "Split", target: "mihomo", config },
        requestUserAgent: userAgent,
      });
      return JSON.parse(output) as {
        dns: { servers: Array<Record<string, unknown>>; rules?: Array<Record<string, unknown>> };
        route: { rules: Array<Record<string, unknown>>; rule_set?: Array<{ tag: string; url: string; format: string }> };
      };
    };

    // 1.14+ resolves first and answers with the real address when it is
    // Chinese, so those connections never enter fake-ip and the IP rules match
    // without the route-level resolve action.
    const split = await profile("SFI (sing-box 1.14.2; language zh_CN)");
    expect(split.dns.rules).toEqual([
      { query_type: ["A", "AAAA"], action: "evaluate", server: "dns-bootstrap" },
      // The template's own MetaCubeX `geoip/cn` rule set is reused, so the list
      // is not downloaded twice.
      { query_type: ["A", "AAAA"], match_response: true, rule_set: ["ChinaIP"], action: "respond" },
      { query_type: ["A", "AAAA"], action: "route", server: "dns-fakeip" },
    ]);
    expect(split.route.rules.some((rule) => rule.action === "resolve")).toBe(false);
    expect(split.route.rule_set?.filter((entry) => entry.tag === "geoip-cn")).toHaveLength(0);

    // A template without any CN IP rule set gets one, so the split still works.
    const bare = await profile("SFI (sing-box 1.14.2; language zh_CN)", { proxyGroups: template.proxyGroups, rules: ["MATCH,🚀 节点选择"] });
    expect(bare.dns.rules?.[1]).toEqual({ query_type: ["A", "AAAA"], match_response: true, rule_set: ["geoip-cn"], action: "respond" });
    expect(bare.route.rule_set?.filter((entry) => entry.tag === "geoip-cn")).toHaveLength(1);
    expect(bare.route.rule_set?.find((entry) => entry.tag === "geoip-cn")?.url)
      .toBe("https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip/cn.srs");

    // 1.12/1.13 reject the `evaluate` / `respond` actions, so they keep the
    // route-level resolve action instead.
    const older = await profile("SFA (sing-box 1.13.0; language zh_CN)");
    expect(older.dns.rules).toEqual([{ query_type: ["A", "AAAA"], server: "dns-fakeip" }]);
    expect(older.route.rules.filter((rule) => rule.action === "resolve")).toEqual([{ action: "resolve", server: "dns-bootstrap" }]);

    // The resolver knob applies to the split as well, and `off` drops both.
    const viaProxy = await profile("SFI (sing-box 1.14.2; language zh_CN)", { ...template, dns: { "fake-ip-resolve": "proxy" } });
    expect(viaProxy.dns.rules?.[0]).toEqual({ query_type: ["A", "AAAA"], action: "evaluate", server: "dns-proxy" });
    const disabled = await profile("SFI (sing-box 1.14.2; language zh_CN)", { ...template, dns: { "fake-ip-resolve": "off" } });
    expect(disabled.dns.rules).toEqual([{ query_type: ["A", "AAAA"], server: "dns-fakeip" }]);
    expect(disabled.route.rules.some((rule) => rule.action === "resolve")).toBe(false);
  });

  it("detects the sing-box core version from the client User-Agent", () => {
    expect(singBoxSupportsHttpClients("SFI (sing-box 1.14.2; language zh_CN)")).toBe(true);
    expect(singBoxSupportsHttpClients("SFA (sing-box 1.13.0; language zh_CN)")).toBe(false);
    expect(singBoxSupportsHttpClients("sing-box/1.15.0-beta.1")).toBe(true);
    expect(singBoxSupportsHttpClients("sing-box 2.0.0")).toBe(true);
    expect(singBoxSupportsHttpClients("sing-box 1.9.0")).toBe(false);
    expect(singBoxSupportsHttpClients("Clash.Meta/v1.19.31")).toBe(false);
    expect(singBoxSupportsHttpClients(undefined)).toBe(false);
    // The CN split rides on the same 1.14 core (`evaluate` / `respond`).
    expect(singBoxSupportsDnsSplit("SFI (sing-box 1.14.2; language zh_CN)")).toBe(true);
    expect(singBoxSupportsDnsSplit("SFA (sing-box 1.13.0; language zh_CN)")).toBe(false);
    expect(singBoxSupportsDnsSplit("sing-box 1.13.9")).toBe(false);
    expect(singBoxSupportsDnsSplit("sing-box 1.15.0-beta.1")).toBe(true);
    expect(singBoxSupportsDnsSplit("Karing/1.2.3")).toBe(false);
  });

  it("skips Clash providers when the profile has no collection or token", async () => {
    const output = await buildSubscription({
      source: {
        id: "sing-box-no-token",
        name: "Sing Box No Token",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/collection/sing-box-no-token/sing-box"),
      target: "sing-box",
      template: {
        id: "custom",
        name: "Custom",
        target: "mihomo",
        config: {
          proxyGroups: [{ name: "🚀 节点选择", type: "select", proxies: ["$all"] }],
          ruleProviders: {
            gfw: { type: "http", behavior: "domain", format: "yaml", url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt", path: "./ruleset/gfw.txt", interval: 86400 },
          },
          rules: ["RULE-SET,gfw,🚀 节点选择", "MATCH,🚀 节点选择"],
        },
      },
    });
    const config = JSON.parse(output) as {
      route: { rules: Array<Record<string, unknown>>; rule_set?: Array<Record<string, unknown>>; final?: string };
    };
    expect(config.route.rule_set).toBeUndefined();
    expect(config.route.rules).toEqual([{ action: "sniff" }, { protocol: "dns", action: "hijack-dns" }]);
    expect(config.route.final).toBe("🚀 节点选择");
  });

  it("parses JSON5 and converts Surge Mac-only node types", async () => {
    const json5 = `{
      // compatible comment
      proxies: [
        { name: 'Snell Node', type: 'snell', server: 'example.com', port: 443, psk: 'secret', },
      ],
    }`;
    expect(validateSubscriptionContent(json5)).toHaveLength(1);
    const converted = await convertSubscriptionContent({ content: json5, target: "surge-mac" });
    expect(converted.content).toContain("Snell Node=snell,example.com,443");
    expect(converted.emitted).toBe(1);
  });

  it("captures allowlisted remote response metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      "trojan://password@example.com:443#Remote%20Node",
      {
        headers: {
          "subscription-userinfo": "upload=1; download=2; total=10",
          "profile-web-page-url": "https://example.com/dashboard",
          "profile-update-interval": "12",
        },
      },
    ));
    const result = await buildSubscriptionResult({
      source: { id: "remote-meta", name: "Remote Meta", type: "remote", url: "https://example.com/sub", content: "" },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/remote-meta/json"),
      target: "json",
      settings: { remoteCacheTtl: 0 },
    });
    expect(result.metadata.subscriptionUserinfo).toContain("total=10");
    expect(result.metadata.profileWebPageUrl).toBe("https://example.com/dashboard");
    expect(result.metadata.profileUpdateInterval).toBe("12");
  });

  it("uses a hashed Cache API key for repeat remote fetches", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      "trojan://password@cache.example.com:443#Cached%20Node",
      { headers: { etag: '"cache-v1"' } },
    ));
    const options = {
      source: { id: "remote-cache", name: "Remote Cache", type: "remote" as const, url: "https://private.example/sub?token=secret-value", content: "" },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/remote-cache/json"),
      target: "json" as const,
      settings: { remoteCacheTtl: 300 },
    };
    await buildSubscriptionResult(options);
    const cached = await buildSubscriptionResult(options);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cached.metadata.cacheStatus).toBe("hit");
  });

  it("renders a JSON target from a local source", async () => {
    const output = await buildSubscription({
      source: {
        id: "local",
        name: "Local",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/local/json"),
      target: "json",
    });
    const payload: unknown = JSON.parse(output);
    expect(payload && typeof payload === "object" ? Reflect.get(payload, "proxies") : undefined).toHaveLength(1);
  });

  it("runs build-time script operators with arguments", async () => {
    const output = await buildSubscription({
      source: {
        id: "script-operator",
        name: "Script Operator",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Script%20Node",
        filters: [{
          type: "script",
          scriptId: "tls-fingerprint",
          scriptKind: "operator",
          arguments: { fingerprint: "firefox" },
        }],
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/script-operator/json"),
      target: "json",
    });
    const payload = JSON.parse(output) as { proxies: Array<Record<string, unknown>> };
    expect(payload.proxies[0]["tls-fingerprint"]).toBe("firefox");
  });

  it("runs build-time script filters and rejects unavailable scripts", async () => {
    const source = {
      id: "script-filter",
      name: "Script Filter",
      type: "local" as const,
      url: "",
      content: [
        "trojan://password@example.com:443#HK%20Node",
        "trojan://password@example.net:443#US%20Node",
      ].join("\n"),
      filters: [{
        type: "script",
        scriptId: "name-regex-filter",
        scriptKind: "filter" as const,
        arguments: { pattern: "^HK", keep: true },
      }],
    };
    const output = await buildSubscription({
      source,
      sources: [],
      requestUrl: new URL("https://example.com/download/source/script-filter/json"),
      target: "json",
    });
    expect(output).toContain("HK Node");
    expect(output).not.toContain("US Node");

    await expect(buildSubscription({
      source: { ...source, filters: [{ type: "script", scriptId: "missing-script" }] },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/script-filter/json"),
      target: "json",
    })).rejects.toThrow("Unknown script: missing-script");
  });

  it("limits script actions per processing stage", async () => {
    await expect(buildSubscription({
      source: {
        id: "too-many-scripts",
        name: "Too Many Scripts",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443#Node",
        filters: Array.from({ length: 3 }, () => ({
          type: "script",
          scriptId: "tls-fingerprint",
          scriptKind: "operator" as const,
          arguments: { fingerprint: "chrome" },
        })),
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/too-many-scripts/json"),
      target: "json",
    })).rejects.toThrow("At most 2 script actions");
  });

  it("rejects sources with too many remote URLs before fetching", async () => {
    const urls = Array.from({ length: MAX_REMOTE_SOURCE_URLS + 1 }, (_, index) => `https://example.com/${index}`).join("\n");
    await expect(buildSubscription({
      source: { id: "remote", name: "Remote", type: "remote", url: urls, content: "" },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/remote/json"),
      target: "json",
    })).rejects.toThrow(`${MAX_REMOTE_SOURCE_URLS} URL limit`);
  });

  it("stops reading oversized remote responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("x".repeat(MAX_REMOTE_SOURCE_RESPONSE_BYTES + 1), { status: 200 }),
    );
    await expect(buildSubscription({
      source: { id: "remote", name: "Remote", type: "remote", url: "https://example.com/sub", content: "" },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/remote/json"),
      target: "json",
    })).rejects.toThrow("2 MiB limit");
  });

  it("honors Content-Length before consuming a response stream", async () => {
    const response = new Response("small", { headers: { "content-length": "999" } });
    await expect(readResponseText(response, 10, "Test response")).rejects.toThrow("10 byte limit");
  });

  it("keeps VLESS and trojan transport options from share links", () => {
    const [vless] = validateSubscriptionContent(
      "vless://00000000-0000-4000-8000-000000000002@example.com:443?security=tls&type=ws&path=%2Fmy-path&host=cdn.example.com#WS%20VLESS",
    ) as Array<Record<string, unknown>>;
    expect(vless.network).toBe("ws");
    expect(vless["ws-opts"]).toEqual({ path: "/my-path", headers: { Host: "cdn.example.com" } });
    const [grpc] = validateSubscriptionContent(
      "vless://00000000-0000-4000-8000-000000000002@example.com:443?security=tls&type=grpc&serviceName=my-service#GRPC%20VLESS",
    ) as Array<Record<string, unknown>>;
    expect(grpc["grpc-opts"]).toEqual({ "grpc-service-name": "my-service" });
    const [h2] = validateSubscriptionContent(
      "vless://00000000-0000-4000-8000-000000000002@example.com:443?security=tls&type=h2&path=%2Fh2&host=h2.example.com#H2%20VLESS",
    ) as Array<Record<string, unknown>>;
    expect(h2["h2-opts"]).toEqual({ host: ["h2.example.com"], path: "/h2" });
    const [trojan] = validateSubscriptionContent("trojan://password@example.com:443?type=ws&path=%2Ftrojan-ws#WS%20Trojan") as Array<Record<string, unknown>>;
    expect(trojan.network).toBe("ws");
    expect(trojan["ws-opts"]).toEqual({ path: "/trojan-ws" });
  });

  it("writes node transports into sing-box transport instead of network", async () => {
    const output = await buildSubscription({
      source: {
        id: "sing-box-transport",
        name: "Sing Box Transport",
        type: "local",
        url: "",
        content: [
          "vless://00000000-0000-4000-8000-000000000002@example.com:443?security=tls&type=ws&path=%2Fmy-path&host=cdn.example.com#WS%20VLESS",
          "trojan://password@example.com:443?sni=example.com&type=ws&path=%2Ftrojan-ws#WS%20Trojan",
        ].join("\n"),
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/source/sing-box-transport/sing-box"),
      target: "sing-box",
    });
    const config = JSON.parse(output) as { outbounds: Array<Record<string, unknown> & { tag?: string }> };
    // `network` only accepts tcp/udp in sing-box; the Clash transport value
    // there makes the whole profile fail to decode.
    const vless = config.outbounds.find((outbound) => outbound.tag === "WS VLESS");
    expect(vless?.network).toBeUndefined();
    expect(vless?.transport).toEqual({ type: "ws", path: "/my-path", headers: { Host: "cdn.example.com" } });
    expect(config.outbounds.find((outbound) => outbound.tag === "WS Trojan")?.transport).toEqual({
      type: "ws",
      path: "/trojan-ws",
    });

  });

  it("rewrites the MetaCubeX rule-set host from the rulesetCdn setting", async () => {
    const acl4ssr = BUILTIN_TEMPLATES.find((template) => template.id === "acl4ssr-mihomo");
    const output = await buildSubscription({
      source: {
        id: "ruleset-cdn",
        name: "Ruleset CDN",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/collection/ruleset-cdn/mihomo"),
      target: "mihomo",
      template: { id: acl4ssr?.id, name: acl4ssr?.name, target: "mihomo", config: acl4ssr?.config || {} },
      settings: { rulesetCdn: "https://mirror.example.com" },
    });
    const document = parseYaml(output) as { "rule-providers"?: Record<string, { url?: string }> };
    const urls = Object.values(document["rule-providers"] || {}).map((entry) => entry.url || "");
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith("https://mirror.example.com/gh/MetaCubeX/meta-rules-dat@meta/geo/"))).toBe(true);
  });

  it("ignores an unsafe rulesetCdn value", async () => {
    const output = await buildSubscription({
      source: {
        id: "ruleset-cdn-unsafe",
        name: "Ruleset CDN Unsafe",
        type: "local",
        url: "",
        content: "trojan://password@example.com:443?sni=example.com#Trojan%20Node",
      },
      sources: [],
      requestUrl: new URL("https://example.com/download/collection/ruleset-cdn-unsafe/mihomo"),
      target: "mihomo",
      template: {
        id: "custom",
        name: "Custom",
        target: "mihomo",
        config: {
          proxyGroups: [{ name: "Proxy", type: "select", proxies: ["$all"] }],
          ruleProviders: {
            Ads: {
              type: "http",
              behavior: "domain",
              format: "mrs",
              url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ads-all.mrs",
              path: "./ruleset/category-ads-all.mrs",
              interval: 86400,
            },
          },
          rules: ["RULE-SET,Ads,REJECT", "MATCH,Proxy"],
        },
      },
      settings: { rulesetCdn: "http://insecure.example.com" },
    });
    const document = parseYaml(output) as { "rule-providers"?: Record<string, { url?: string }> };
    expect(document["rule-providers"]?.Ads.url).toContain("https://cdn.jsdelivr.net/");

  });
});
