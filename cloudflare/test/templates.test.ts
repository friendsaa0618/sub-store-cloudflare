import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import { BUILTIN_TEMPLATES } from "../src/lib/defaults";
import { convertSubscriptionContent } from "../src/lib/subscription";

const SAMPLE = "trojan://password@example.com:443?sni=example.com#HK%20Node";
const BUILTIN_POLICIES = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS"]);

describe("built-in rule templates", () => {
  it("serves the ACL4SSR and AI templates from compiled MetaCubeX rule-sets", () => {
    const acl4ssr = BUILTIN_TEMPLATES.find((template) => template.id === "acl4ssr-mihomo");
    const streaming = BUILTIN_TEMPLATES.find((template) => template.id === "ai-streaming-mihomo");
    const loyalsoldier = BUILTIN_TEMPLATES.find((template) => template.id === "loyalsoldier-whitelist");
    for (const template of [acl4ssr, streaming]) {
      const providers = (template?.config.ruleProviders || {}) as Record<string, { format?: string; url?: string; behavior?: string }>;
      expect(Object.keys(providers).length, `${template?.id} providers`).toBeGreaterThan(0);
      for (const [name, entry] of Object.entries(providers)) {
        expect(entry.format, `${template?.id}/${name} format`).toBe("mrs");
        expect(entry.url, `${template?.id}/${name} url`)
          .toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/MetaCubeX\/meta-rules-dat@meta\/geo\/(geosite|geoip)\/.+\.mrs$/);
        expect(["domain", "ipcidr"], `${template?.id}/${name} behavior`).toContain(entry.behavior);
      }
    }
    // The Loyalsoldier presets keep their own lists: reject/direct/tld-not-cn have
    // no MetaCubeX twin.
    expect(loyalsoldier && new Set(Object.values(providerFormats(loyalsoldier.config.ruleProviders)))).toEqual(new Set(["yaml"]));
  });

  it("keeps rule-set names and policies consistent with providers and groups", () => {
    for (const template of BUILTIN_TEMPLATES) {
      const groupNames = new Set((template.config.proxyGroups || []).map((group) => group.name));
      const providerNames = new Set(Object.keys(template.config.ruleProviders || {}));
      for (const rule of template.config.rules || []) {
        const parts = rule.split(",").map((part) => part.trim());
        if (parts[0] === "RULE-SET") {
          expect(providerNames.has(parts[1]), `${template.id} missing provider ${parts[1]}`).toBe(true);
          expect(
            groupNames.has(parts[2]) || BUILTIN_POLICIES.has(parts[2]),
            `${template.id} rule ${rule} points at unknown policy`,
          ).toBe(true);
        } else if (parts[0] === "MATCH") {
          expect(groupNames.has(parts[1]) || BUILTIN_POLICIES.has(parts[1]), `${template.id} MATCH policy missing`).toBe(true);
        } else if (parts[2]) {
          expect(
            groupNames.has(parts[2]) || BUILTIN_POLICIES.has(parts[2]),
            `${template.id} rule ${rule} points at unknown policy`,
          ).toBe(true);
        }
      }
    }
  });

  it("renders each built-in template into Mihomo YAML with expanded groups", async () => {
    for (const template of BUILTIN_TEMPLATES) {
      const converted = await convertSubscriptionContent({
        content: SAMPLE,
        target: "mihomo",
        template: { config: template.config },
      });
      const document = parseYaml(converted.content) as {
        "proxy-groups"?: Array<{ name: string; proxies?: string[] }>;
        "rule-providers"?: Record<string, { format?: string }>;
        rules?: string[];
      };
      const groups = document["proxy-groups"] || [];
      expect(groups.length, `${template.id} should emit proxy groups`).toBeGreaterThan(0);
      expect(groups.some((group) => group.proxies?.includes("HK Node"))).toBe(true);
      expect(groups.some((group) => group.proxies?.includes("$all"))).toBe(false);
      expect(document.rules?.at(-1)).toMatch(/^MATCH,/);
      if (template.id === "mihomo-basic") {
        expect(document["rule-providers"]).toBeUndefined();
      } else {
        expect(Object.keys(document["rule-providers"] || {}).length).toBeGreaterThan(0);
      }
      if (template.id === "acl4ssr-mihomo-no-emoji") {
        expect(groups.map((group) => group.name).join(" ")).not.toMatch(/[🚀♻️🌏💬Ⓜ️🍎🎯🛑🐟]/);
      }
    }
  });

  it("drops dangling group references instead of emitting empty groups", async () => {
    const converted = await convertSubscriptionContent({
      content: SAMPLE,
      target: "mihomo",
      template: {
        config: {
          proxyGroups: [
            { name: "Empty", type: "select", proxies: ["Missing"] },
            { name: "Proxy", type: "select", proxies: ["$all", "Empty"] },
          ],
          rules: ["MATCH,Proxy"],
        },
      },
    });
    const document = parseYaml(converted.content) as {
      "proxy-groups"?: Array<{ name: string; proxies?: string[] }>;
      rules?: string[];
    };
    expect(document["proxy-groups"]?.map((group) => group.name)).toEqual(["Proxy"]);
    expect(document["proxy-groups"]?.[0]?.proxies).toEqual(["HK Node"]);
    expect(document.rules).toEqual(["MATCH,Proxy"]);
  });

  it("uses the first rendered group as the fallback MATCH policy", async () => {
    const converted = await convertSubscriptionContent({
      content: SAMPLE,
      target: "mihomo",
      template: {
        config: {
          proxyGroups: [{ name: "Manual", type: "select", proxies: ["$all"] }],
        },
      },
    });
    const document = parseYaml(converted.content) as { rules?: string[] };
    expect(document.rules).toEqual(["MATCH,Manual"]);
  });
});

function providerFormats(providers: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(providers || {}).map(([name, value]) => {
      const provider = value && typeof value === "object" ? value as { format?: string } : {};
      return [name, provider.format];
    }),
  );
}
