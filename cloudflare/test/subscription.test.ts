import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_REMOTE_SOURCE_RESPONSE_BYTES,
  MAX_REMOTE_SOURCE_URLS,
} from "../src/lib/limits";
import { readResponseText } from "../src/lib/read";
import { buildSubscription, buildSubscriptionResult, convertSubscriptionContent, normalizeTargetAlias, validateSubscriptionContent } from "../src/lib/subscription";

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
      ],
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
});
