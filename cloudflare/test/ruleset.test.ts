import { describe, expect, it } from "vitest";
import { classifyRuleProviderEntry, toSingBoxRuleSet } from "../src/lib/ruleset";

describe("Clash rule provider conversion", () => {
  it("converts Loyalsoldier-style YAML payloads", () => {
    const text = [
      "payload:",
      "  - '+.example.com'",
      "  - 'example.net'",
      "  - '10.0.0.0/8'",
      "  - PROCESS-NAME,frpc",
      "  - '+.0.avmarket.rs'",
    ].join("\n");
    expect(toSingBoxRuleSet(text)).toEqual({
      version: 1,
      rules: [
        { domain_suffix: ["0.avmarket.rs", "example.com", "example.net"] },
        { ip_cidr: ["10.0.0.0/8"] },
        { process_name: ["frpc"] },
      ],
    });
  });

  it("converts Surge-style .list lines and drops unsupported rule types", () => {
    const text = [
      "# 直连列表",
      "DOMAIN-SUFFIX,google.com",
      "DOMAIN,exact.example",
      "DOMAIN-KEYWORD,ads",
      "IP-CIDR,1.2.3.0/24,no-resolve",
      "IP-CIDR6,2001:db8::/32,no-resolve",
      "URL-REGEX,^https://example\\.com",
      "GEOIP,CN",
      "RULE-SET,Other,PROXY",
      "",
    ].join("\n");
    expect(toSingBoxRuleSet(text)).toEqual({
      version: 1,
      rules: [
        { domain_suffix: ["google.com"] },
        { domain: ["exact.example"] },
        { domain_keyword: ["ads"] },
        { ip_cidr: ["1.2.3.0/24", "2001:db8::/32"] },
      ],
    });
  });

  it("keeps a bare CIDR as an IP rule and everything else as a domain suffix", () => {
    expect(classifyRuleProviderEntry("+.example.com")).toEqual({ field: "domain_suffix", value: "example.com" });
    expect(classifyRuleProviderEntry("*.example.com")).toEqual({ field: "domain_suffix", value: "example.com" });
    expect(classifyRuleProviderEntry("example.com")).toEqual({ field: "domain_suffix", value: "example.com" });
    expect(classifyRuleProviderEntry("91.105.192.0/23")).toEqual({ field: "ip_cidr", value: "91.105.192.0/23" });
    expect(classifyRuleProviderEntry("2001:db8::/32")).toEqual({ field: "ip_cidr", value: "2001:db8::/32" });
    expect(classifyRuleProviderEntry("# comment")).toBeUndefined();
    expect(classifyRuleProviderEntry("")).toBeUndefined();
  });

  it("handles empty and comment-only payloads", () => {
    expect(toSingBoxRuleSet("")).toEqual({ version: 1, rules: [] });
    expect(toSingBoxRuleSet("# nothing here\n")).toEqual({ version: 1, rules: [] });
  });
});