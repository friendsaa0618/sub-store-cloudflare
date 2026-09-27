import type { RoutingTemplateConfig, TemplateRecord } from "../types";

export const DEFAULT_TEMPLATE_ID = "acl4ssr-mihomo";

const TEST_URL = "https://www.gstatic.com/generate_204";

const baseGroups = [
  { name: "🚀 节点选择", type: "select", proxies: ["♻️ 自动选择", "🚀 手动切换", "DIRECT"] },
  { name: "♻️ 自动选择", type: "url-test", proxies: ["$all"], url: TEST_URL, interval: 300, tolerance: 50 },
  { name: "🚀 手动切换", type: "select", proxies: ["$all"] },
  { name: "🌏 国外媒体", type: "select", proxies: ["🚀 节点选择", "♻️ 自动选择", "🚀 手动切换", "DIRECT"] },
  { name: "💬 AI 服务", type: "select", proxies: ["🚀 节点选择", "♻️ 自动选择", "🚀 手动切换", "DIRECT"] },
  { name: "Ⓜ️ 微软服务", type: "select", proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择"] },
  { name: "🍎 苹果服务", type: "select", proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择"] },
  { name: "🎯 全球直连", type: "select", proxies: ["DIRECT", "🚀 节点选择"] },
  { name: "🛑 全球拦截", type: "select", proxies: ["REJECT", "DIRECT"] },
  { name: "🐟 漏网之鱼", type: "select", proxies: ["🚀 节点选择", "DIRECT"] },
];

const defaultDns = {
  enable: true,
  ipv6: false,
  "enhanced-mode": "fake-ip",
  nameserver: ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
};

function provider(url: string, behavior: "domain" | "ipcidr" | "classical" = "classical", path?: string) {
  const filename = url.split("/").pop() || "ruleset";
  // Mihomo defaults rule-provider format to yaml. ACL4SSR .list files are
  // Surge-style text, Loyalsoldier .txt and blackmatrix .yaml ship YAML
  // payloads, and the MetaCubeX rule-sets are compiled `.mrs` binaries.
  const format = filename.endsWith(".list") ? "text" : filename.endsWith(".mrs") ? "mrs" : "yaml";
  return {
    type: "http",
    behavior,
    format,
    url,
    // Two providers can share a file name (`geosite/telegram.mrs` and
    // `geoip/telegram.mrs`), so the cache path is explicit where it matters.
    path: path || `./ruleset/${filename}`,
    interval: 86400,
  };
}

// Rule data comes from MetaCubeX/meta-rules-dat, which is maintained for both
// Mihomo (`meta` branch, compiled `.mrs`) and sing-box (`sing` branch, `.srs`).
// The CDN host is a deployment setting: `settings.rulesetCdn` rewrites it at
// render time, see `withRulesetCdn` in lib/subscription.ts.
export const DEFAULT_RULESET_CDN = "https://cdn.jsdelivr.net";

function metaRuleset(kind: "geosite" | "geoip", name: string, behavior: "domain" | "ipcidr") {
  const slug = name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return provider(
    `${DEFAULT_RULESET_CDN}/gh/MetaCubeX/meta-rules-dat@meta/geo/${kind}/${name}.mrs`,
    behavior,
    `./ruleset/${kind}-${slug}.mrs`,
  );
}

function loyalSoldier(name: string) {
  return `https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/${name}.txt`;
}

const mihomoBase: Omit<RoutingTemplateConfig, "ruleProviders" | "rules"> = {
  mixedPort: 7890,
  allowLan: false,
  mode: "rule",
  logLevel: "info",
  dns: defaultDns,
  proxyGroups: baseGroups,
};

export const MIHOMO_BASIC_TEMPLATE: RoutingTemplateConfig = {
  ...mihomoBase,
  ruleProviders: {},
  rules: [
    "DOMAIN-SUFFIX,openai.com,💬 AI 服务",
    "DOMAIN-SUFFIX,chatgpt.com,💬 AI 服务",
    "DOMAIN-SUFFIX,anthropic.com,💬 AI 服务",
    "DOMAIN-SUFFIX,claude.ai,💬 AI 服务",
    "DOMAIN-SUFFIX,netflix.com,🌏 国外媒体",
    "DOMAIN-SUFFIX,youtube.com,🌏 国外媒体",
    "DOMAIN-SUFFIX,googlevideo.com,🌏 国外媒体",
    "GEOIP,CN,🎯 全球直连",
    "MATCH,🐟 漏网之鱼",
  ],
};

export const ACL4SSR_TEMPLATE: RoutingTemplateConfig = {
  ...mihomoBase,
  // Provider names stay close to the original ACL4SSR lists; the payloads come
  // from MetaCubeX/meta-rules-dat (see metaRuleset).
  ruleProviders: {
    LocalAreaNetwork: metaRuleset("geosite", "private", "domain"),
    LocalAreaNetworkIP: metaRuleset("geoip", "private", "ipcidr"),
    Ads: metaRuleset("geosite", "category-ads-all", "domain"),
    GoogleCN: metaRuleset("geosite", "google-cn", "domain"),
    SteamCN: metaRuleset("geosite", "steam@cn", "domain"),
    Microsoft: metaRuleset("geosite", "microsoft", "domain"),
    Apple: metaRuleset("geosite", "apple", "domain"),
    Telegram: metaRuleset("geosite", "telegram", "domain"),
    TelegramIP: metaRuleset("geoip", "telegram", "ipcidr"),
    AI: metaRuleset("geosite", "category-ai-!cn", "domain"),
    YouTube: metaRuleset("geosite", "youtube", "domain"),
    Netflix: metaRuleset("geosite", "netflix", "domain"),
    DisneyPlus: metaRuleset("geosite", "disney", "domain"),
    GFW: metaRuleset("geosite", "gfw", "domain"),
    ChinaDomain: metaRuleset("geosite", "geolocation-cn", "domain"),
    ChinaIP: metaRuleset("geoip", "cn", "ipcidr"),
  },
  rules: [
    "RULE-SET,LocalAreaNetwork,DIRECT",
    "RULE-SET,LocalAreaNetworkIP,DIRECT",
    "RULE-SET,Ads,🛑 全球拦截",
    "RULE-SET,GoogleCN,DIRECT",
    "RULE-SET,SteamCN,DIRECT",
    "RULE-SET,Microsoft,Ⓜ️ 微软服务",
    "RULE-SET,Apple,🍎 苹果服务",
    "RULE-SET,Telegram,🚀 节点选择",
    "RULE-SET,TelegramIP,🚀 节点选择",
    "RULE-SET,AI,💬 AI 服务",
    "RULE-SET,YouTube,🌏 国外媒体",
    "RULE-SET,Netflix,🌏 国外媒体",
    "RULE-SET,DisneyPlus,🌏 国外媒体",
    "RULE-SET,GFW,🚀 节点选择",
    "RULE-SET,ChinaDomain,DIRECT",
    "RULE-SET,ChinaIP,DIRECT",
    "GEOIP,CN,🎯 全球直连",
    "MATCH,🐟 漏网之鱼",
  ],
};

const loyalSoldierProviders = {
  reject: provider(loyalSoldier("reject"), "domain"),
  icloud: provider(loyalSoldier("icloud"), "domain"),
  apple: provider(loyalSoldier("apple"), "domain"),
  google: provider(loyalSoldier("google"), "domain"),
  proxy: provider(loyalSoldier("proxy"), "domain"),
  direct: provider(loyalSoldier("direct"), "domain"),
  private: provider(loyalSoldier("private"), "domain"),
  gfw: provider(loyalSoldier("gfw"), "domain"),
  greatfire: provider(loyalSoldier("greatfire"), "domain"),
  "tld-not-cn": provider(loyalSoldier("tld-not-cn"), "domain"),
  telegramcidr: provider(loyalSoldier("telegramcidr"), "ipcidr"),
  cncidr: provider(loyalSoldier("cncidr"), "ipcidr"),
  lancidr: provider(loyalSoldier("lancidr"), "ipcidr"),
  applications: provider(loyalSoldier("applications"), "classical"),
};

export const LOYALSOLDIER_WHITELIST_TEMPLATE: RoutingTemplateConfig = {
  ...mihomoBase,
  ruleProviders: loyalSoldierProviders,
  rules: [
    "RULE-SET,reject,🛑 全球拦截",
    "RULE-SET,icloud,DIRECT",
    "RULE-SET,apple,DIRECT",
    "RULE-SET,google,🚀 节点选择",
    "RULE-SET,proxy,🚀 节点选择",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,private,DIRECT",
    "RULE-SET,gfw,🚀 节点选择",
    "RULE-SET,greatfire,🚀 节点选择",
    "RULE-SET,tld-not-cn,🚀 节点选择",
    "RULE-SET,telegramcidr,🚀 节点选择",
    "RULE-SET,cncidr,DIRECT",
    "RULE-SET,lancidr,DIRECT",
    "RULE-SET,applications,DIRECT",
    "GEOIP,CN,DIRECT",
    "MATCH,🚀 节点选择",
  ],
};

export const LOYALSOLDIER_BLACKLIST_TEMPLATE: RoutingTemplateConfig = {
  ...LOYALSOLDIER_WHITELIST_TEMPLATE,
  rules: [
    "RULE-SET,reject,🛑 全球拦截",
    "RULE-SET,private,DIRECT",
    "RULE-SET,lancidr,DIRECT",
    "RULE-SET,cncidr,DIRECT",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,applications,DIRECT",
    "RULE-SET,icloud,DIRECT",
    "RULE-SET,apple,DIRECT",
    "RULE-SET,google,🚀 节点选择",
    "RULE-SET,proxy,🚀 节点选择",
    "RULE-SET,gfw,🚀 节点选择",
    "RULE-SET,greatfire,🚀 节点选择",
    "RULE-SET,tld-not-cn,🚀 节点选择",
    "RULE-SET,telegramcidr,🚀 节点选择",
    "GEOIP,CN,DIRECT",
    "MATCH,DIRECT",
  ],
};

export const AI_STREAMING_TEMPLATE: RoutingTemplateConfig = {
  ...mihomoBase,
  ruleProviders: {
    AI: metaRuleset("geosite", "category-ai-!cn", "domain"),
    YouTube: metaRuleset("geosite", "youtube", "domain"),
    Netflix: metaRuleset("geosite", "netflix", "domain"),
    Disney: metaRuleset("geosite", "disney", "domain"),
    Spotify: metaRuleset("geosite", "spotify", "domain"),
    Telegram: metaRuleset("geosite", "telegram", "domain"),
    TelegramIP: metaRuleset("geoip", "telegram", "ipcidr"),
    GitHub: metaRuleset("geosite", "github", "domain"),
    ChinaDomain: metaRuleset("geosite", "geolocation-cn", "domain"),
    ChinaIP: metaRuleset("geoip", "cn", "ipcidr"),
  },
  rules: [
    "RULE-SET,AI,💬 AI 服务",
    "RULE-SET,YouTube,🌏 国外媒体",
    "RULE-SET,Netflix,🌏 国外媒体",
    "RULE-SET,Disney,🌏 国外媒体",
    "RULE-SET,Spotify,🌏 国外媒体",
    "RULE-SET,Telegram,🚀 节点选择",
    "RULE-SET,TelegramIP,🚀 节点选择",
    "RULE-SET,GitHub,🚀 节点选择",
    "RULE-SET,ChinaDomain,DIRECT",
    "RULE-SET,ChinaIP,DIRECT",
    "GEOIP,CN,🎯 全球直连",
    "MATCH,🐟 漏网之鱼",
  ],
};

const labelMap: Record<string, string> = {
  "🚀 节点选择": "节点选择",
  "♻️ 自动选择": "自动选择",
  "🚀 手动切换": "手动切换",
  "🌏 国外媒体": "国外媒体",
  "💬 AI 服务": "AI 服务",
  "Ⓜ️ 微软服务": "微软服务",
  "🍎 苹果服务": "苹果服务",
  "🎯 全球直连": "全球直连",
  "🛑 全球拦截": "全球拦截",
  "🐟 漏网之鱼": "漏网之鱼",
};

function withoutEmojiLabels(input: unknown): unknown {
  if (typeof input === "string") {
    return Object.entries(labelMap).reduce((text, [from, to]) => text.replaceAll(from, to), input);
  }
  if (Array.isArray(input)) return input.map(withoutEmojiLabels);
  if (input && typeof input === "object") {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, withoutEmojiLabels(value)]));
  }
  return input;
}

export const ACL4SSR_NO_EMOJI_TEMPLATE = withoutEmojiLabels(ACL4SSR_TEMPLATE) as RoutingTemplateConfig;

export const BUILTIN_TEMPLATES = [
  { id: "mihomo-basic", name: "Mihomo Basic", target: "mihomo", config: MIHOMO_BASIC_TEMPLATE },
  { id: "acl4ssr-mihomo", name: "ACL4SSR Mihomo", target: "mihomo", config: ACL4SSR_TEMPLATE },
  { id: "acl4ssr-mihomo-no-emoji", name: "ACL4SSR Mihomo 无 Emoji", target: "mihomo", config: ACL4SSR_NO_EMOJI_TEMPLATE },
  { id: "loyalsoldier-whitelist", name: "Loyalsoldier 白名单", target: "mihomo", config: LOYALSOLDIER_WHITELIST_TEMPLATE },
  { id: "loyalsoldier-blacklist", name: "Loyalsoldier 黑名单", target: "mihomo", config: LOYALSOLDIER_BLACKLIST_TEMPLATE },
  { id: "ai-streaming-mihomo", name: "AI + Streaming", target: "mihomo", config: AI_STREAMING_TEMPLATE },
] satisfies Array<Pick<TemplateRecord, "id" | "name" | "target" | "config">>;

export const BUILTIN_TEMPLATE_IDS = new Set(BUILTIN_TEMPLATES.map((template) => template.id));
export const DEFAULT_TEMPLATE_CONFIG = ACL4SSR_TEMPLATE;
