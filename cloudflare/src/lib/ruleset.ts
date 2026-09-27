import { parse as parseYaml } from "yaml";
import { MAX_RULE_PROVIDER_RESPONSE_BYTES } from "./limits";
import { readResponseText } from "./read";

// Clash rule types that map onto sing-box headless rule items. Everything else
// (GEOIP, GEOSITE, URL-REGEX, IP-ASN, SCRIPT, ...) has no equivalent inside a
// sing-box rule set and is dropped by the converter.
const RULE_FIELD_BY_TYPE: Record<string, string> = {
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

const CIDR_PATTERN = /^[0-9a-fA-F:.]+\/\d{1,3}$/;

export type SingBoxRuleSetDocument = {
  version: 1;
  rules: Array<Record<string, string[]>>;
};

// Loyalsoldier `.txt` and blackmatrix `.yaml` providers ship a YAML `payload`
// list; ACL4SSR `.list` files are plain Surge-style lines.
export function ruleProviderEntries(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (/(^|\n)\s*payload\s*:/.test(trimmed)) {
    try {
      const document = parseYaml(trimmed) as { payload?: unknown } | null;
      const payload = document?.payload;
      if (Array.isArray(payload)) return payload.map((entry) => String(entry));
    } catch {
      // Fall through to the line-based reader below.
    }
  }
  return trimmed.split(/\r?\n/);
}

export function classifyRuleProviderEntry(entry: string) {
  const line = entry.trim().replace(/^['"]|['"]$/g, "").trim();
  if (!line || line.startsWith("#") || line.startsWith("//")) return undefined;
  const parts = line.split(",").map((part) => part.trim());
  const head = (parts[0] || "").toUpperCase();
  if (parts.length > 1) {
    const field = RULE_FIELD_BY_TYPE[head];
    if (!field) return undefined;
    return parts[1] ? { field, value: parts[1] } : undefined;
  }
  // Payload entries: `+.example.com`, `*.example.com`, `example.com`, `10.0.0.0/8`.
  const value = line.replace(/^\+\./, "").replace(/^\*\./, "");
  if (CIDR_PATTERN.test(value)) return { field: "ip_cidr", value };
  return { field: "domain_suffix", value };
}

export function toSingBoxRuleSet(text: string): SingBoxRuleSetDocument {
  const buckets = new Map<string, Set<string>>();
  for (const entry of ruleProviderEntries(text)) {
    const classified = classifyRuleProviderEntry(entry);
    if (!classified) continue;
    const values = buckets.get(classified.field) || new Set<string>();
    values.add(classified.value);
    buckets.set(classified.field, values);
  }
  const rules = [...buckets].map(([field, values]) => ({ [field]: [...values].sort() }));
  return { version: 1, rules };
}

// Clash rule providers cannot be referenced from sing-box directly: it only
// reads `source` (JSON) or `binary` (.srs) rule sets. Converted documents are
// cached so repeated client refreshes do not re-download and re-parse the
// upstream list.
export async function loadConvertedRuleSet(
  url: string,
  ttlSeconds: number,
  fetcher: typeof fetch = fetch,
) {
  const key = await ruleSetCacheKey(url);
  const cached = await safeCacheMatch(key);
  if (cached) return cached;
  const response = await fetcher(url, { headers: { accept: "text/plain, application/yaml, text/yaml, */*" } });
  if (!response.ok) throw new Error(`Rule provider responded with ${response.status}`);
  const body = JSON.stringify(toSingBoxRuleSet(await readResponseText(response, MAX_RULE_PROVIDER_RESPONSE_BYTES, "Rule provider response")));
  await safeCachePut(key, body, ttlSeconds);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, s-maxage=${ttlSeconds}`,
    },
  });
}

async function ruleSetCacheKey(url: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`https://sub-store-cache.invalid/ruleset/${hash}`);
}

async function safeCacheMatch(key: Request) {
  try {
    return await caches.default.match(key);
  } catch {
    return undefined;
  }
}

async function safeCachePut(key: Request, body: string, ttlSeconds: number) {
  try {
    await caches.default.put(key, new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, s-maxage=${ttlSeconds}`,
      },
    }));
  } catch {
    // The Cache API is optional and must not break rule-set serving.
  }
}