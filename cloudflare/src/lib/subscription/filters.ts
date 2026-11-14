import { MAX_DOH_RESPONSE_BYTES } from "../limits";
import { readResponseText } from "../read";
import { applyScriptAction, validateScriptActions } from "../scripts";
import type {
  AppSettings,
  FilterRule,
  ProxyNode,
  SubscriptionCollection,
  SubscriptionSource,
  SubscriptionTarget,
} from "../../types";
import { getRequestConcurrency, getRequestConcurrencyWait, getRequestTimeout, runWithConcurrency } from "./concurrency";
import { compileRegex, getByPath, numberSetting, setByPath, stringSetting } from "./utils";

export function getFilters(input: SubscriptionSource | SubscriptionCollection | undefined): FilterRule[] {
  const filters = input?.filters || [];
  return Array.isArray(filters) ? (filters as FilterRule[]) : [];
}

export async function applyFilters(
  proxies: ProxyNode[],
  filters: FilterRule[],
  settings?: AppSettings,
  scriptContext: { targetPlatform: SubscriptionTarget; sourceId?: string; collectionId?: string } = { targetPlatform: "json" },
) {
  const scriptError = validateScriptActions(filters);
  if (scriptError) throw new Error(scriptError);
  let current = proxies;
  for (const filter of filters) {
    if (!filter || typeof filter !== "object") continue;
    if (filter.type === "include") current = matchFilter(current, filter, true);
    else if (filter.type === "exclude") current = matchFilter(current, filter, false);
    else if (filter.type === "rename") current = renameProxies(current, filter);
    else if (filter.type === "delete-field") current = deleteFieldMatches(current, filter);
    else if (filter.type === "dedupe") current = handleDuplicateProxies(current, filter);
    else if (filter.type === "sort") current = sortProxies(current, filter.direction || "asc");
    else if (filter.type === "regex-sort") current = regexSortProxies(current, filter);
    else if (filter.type === "flag") current = flagProxies(current, filter);
    else if (filter.type === "quick") current = applyQuickSettings(current, filter);
    else if (filter.type === "resolve") current = await resolveProxyDomains(current, filter, settings);
    else if (filter.type === "script") current = await applyScriptAction(current, filter, scriptContext.targetPlatform, {
      sourceId: scriptContext.sourceId,
      collectionId: scriptContext.collectionId,
    });
  }
  return current;
}

function matchFilter(proxies: ProxyNode[], filter: FilterRule, keepMatches: boolean) {
  if (!filter.pattern) return proxies;
  const pattern = compileRegex(filter.pattern);
  const field = filter.field || "name";
  return proxies.filter((proxy) => {
    const matched = pattern.test(String(getByPath(proxy, field) || ""));
    return keepMatches ? matched : !matched;
  });
}

function renameProxies(proxies: ProxyNode[], filter: FilterRule) {
  if (!filter.pattern) return proxies;
  const pattern = compileRegex(filter.pattern, "g");
  const replacement = filter.replacement || "";
  const field = filter.field || "name";
  return proxies.map((proxy) => setByPath({ ...proxy }, field, String(getByPath(proxy, field) || "").replace(pattern, replacement).trim()));
}

function deleteFieldMatches(proxies: ProxyNode[], filter: FilterRule) {
  const patterns = (filter.patterns || (filter.pattern ? [filter.pattern] : []))
    .map((pattern) => compileRegex(String(pattern), "g"));
  if (patterns.length === 0) return proxies;
  const field = filter.field || "name";
  // Most delete-field filters target `name`; skip the per-node path split and
  // leave nodes whose value did not change untouched instead of copying them.
  const simple = !field.includes(".");
  return proxies.map((proxy) => {
    const current = simple ? proxy[field] : getByPath(proxy, field);
    let value = String(current || "");
    for (const pattern of patterns) value = value.replace(pattern, "");
    value = value.trim();
    if (value === current) return proxy;
    return simple ? { ...proxy, [field]: value } : setByPath({ ...proxy }, field, value);
  });
}

function handleDuplicateProxies(proxies: ProxyNode[], filter: FilterRule) {
  const fields = normalizeDedupeFields(filter.fields || [filter.field || "name"]);
  const keyOf = createDuplicateKey(fields);
  if (filter.action === "rename") return renameDuplicateProxies(proxies, keyOf, filter);
  return deleteDuplicateProxies(proxies, keyOf);
}

function normalizeDedupeFields(fields: unknown) {
  const list = Array.isArray(fields) ? fields : [fields];
  const normalized = list.map(String).map((field) => field.trim()).filter(Boolean);
  // An empty field list would collapse every node into one key and delete all
  // but the first, so fall back to the default dedupe key.
  return normalized.length > 0 ? normalized : ["name"];
}

function deleteDuplicateProxies(proxies: ProxyNode[], keyOf: DuplicateKey) {
  const seen = new Set<string>();
  return proxies.filter((proxy) => {
    const key = keyOf(proxy);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renameDuplicateProxies(proxies: ProxyNode[], keyOf: DuplicateKey, filter: FilterRule) {
  const counters = new Map<string, number>();
  for (const proxy of proxies) {
    const key = keyOf(proxy);
    counters.set(key, (counters.get(key) || 0) + 1);
  }

  const increments = new Map<string, number>();
  const maxLen = Math.max(1, ...[...counters.values()].map((count) => String(count).length));
  const digits = String(filter.template || "0 1 2 3 4 5 6 7 8 9").split(/\s+/).filter(Boolean);
  const link = String(filter.link ?? "-");
  const position = filter.position === "front" ? "front" : "back";

  return proxies.map((proxy) => {
    const key = keyOf(proxy);
    if ((counters.get(key) || 0) <= 1) return proxy;
    const count = (increments.get(key) || 0) + 1;
    increments.set(key, count);
    const suffix = formatDuplicateNumber(count, maxLen, digits);
    return {
      ...proxy,
      name: position === "front" ? `${suffix}${link}${proxy.name}` : `${proxy.name}${link}${suffix}`,
    };
  });
}

type DuplicateKey = (proxy: ProxyNode) => string;

function createDuplicateKey(fields: string[]): DuplicateKey {
  // Resolve dotted paths once per filter application instead of splitting the
  // same field path for every node, and avoid the per-node array/join churn.
  const simple = fields.map((field) => !field.includes("."));
  return (proxy) => {
    let key = "";
    for (let index = 0; index < fields.length; index += 1) {
      if (index > 0) key += "\n";
      const value = simple[index] ? proxy[fields[index]] : getByPath(proxy, fields[index]);
      key += String(value || "-");
    }
    return key;
  };
}

function formatDuplicateNumber(input: number, minLength: number, digits: string[]) {
  const normalizedDigits = digits.length >= 10 ? digits : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let count = input;
  let output = "";
  do {
    output = normalizedDigits[count % 10] + output;
    count = Math.floor(count / 10);
  } while (count > 0);
  while (output.length < minLength) output = normalizedDigits[0] + output;
  return output;
}

const NAME_COLLATOR = new Intl.Collator("zh-Hans-CN");

function sortProxies(proxies: ProxyNode[], direction: string) {
  if (direction === "random") return shuffleProxies(proxies);
  return [...proxies].sort((a, b) => {
    const result = NAME_COLLATOR.compare(a.name, b.name);
    return direction === "desc" ? -result : result;
  });
}

function regexSortProxies(proxies: ProxyNode[], filter: FilterRule) {
  const expressions = (filter.expressions || filter.patterns || (filter.pattern ? [filter.pattern] : []))
    .map(String)
    .filter(Boolean)
    .map((pattern) => compileRegex(pattern));
  const direction = filter.direction || "asc";
  if (expressions.length === 0) return sortProxies(proxies, direction);

  return proxies
    .map((proxy) => ({ proxy, order: regexOrder(expressions, proxy.name) }))
    .sort((a, b) => {
      if (a.order && !b.order) return -1;
      if (b.order && !a.order) return 1;
      if (a.order && b.order) return a.order - b.order;
      if (direction === "original") return 0;
      const result = NAME_COLLATOR.compare(a.proxy.name, b.proxy.name);
      return direction === "desc" ? -result : result;
    })
    .map((item) => item.proxy);
}

function regexOrder(expressions: RegExp[], name: string) {
  for (let index = 0; index < expressions.length; index += 1) {
    if (expressions[index].test(name)) return index + 1;
  }
  return 0;
}

function shuffleProxies(proxies: ProxyNode[]) {
  const next = [...proxies];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = secureRandomInt(index + 1);
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function secureRandomInt(maxExclusive: number) {
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % maxExclusive;
}

function flagProxies(proxies: ProxyNode[], filter: FilterRule) {
  const mode = String(filter.mode || filter.action || "add");
  const tw = String(filter.tw || "cn");
  return proxies.map((proxy) => {
    const cleanName = removeFlag(proxy.name).trim();
    if (mode === "remove") return { ...proxy, name: cleanName };
    const flag = normalizeTaiwanFlag(detectFlag(proxy.name), tw);
    return { ...proxy, name: `${flag} ${cleanName}`.trim() };
  });
}

function applyQuickSettings(proxies: ProxyNode[], filter: FilterRule) {
  let next = proxies;
  if (stateEnabled(filter.useless)) {
    next = next.filter(isUsefulProxy);
  }

  return next.map((proxy) => {
    const output = { ...proxy };
    applyState(output, "udp", filter.udp);
    applyState(output, "tfo", filter.tfo);
    applyState(output, "fast-open", filter.tfo);
    applyState(output, "skip-cert-verify", filter.scert ?? filter["skip-cert-verify"]);
    if (output.type === "vmess") applyState(output, "aead", filter["vmess aead"]);
    return output;
  });
}

async function resolveProxyDomains(proxies: ProxyNode[], filter: FilterRule, settings?: AppSettings) {
  const tasks = proxies.map((proxy) => async () => resolveProxyDomain(proxy, filter, settings));
  const resolved = await runWithConcurrency(tasks, getResolveConcurrency(filter, settings), getRequestConcurrencyWait(settings));
  const mode = String(filter.filter || "disabled");

  return resolved
    .filter(({ proxy, resolved }) => {
      if (mode === "removeFailed") return resolved || !shouldResolveServer(proxy.server);
      if (mode === "IPOnly") return isIpAddress(String(proxy.server || ""));
      if (mode === "IPv4Only") return isIpv4(String(proxy.server || ""));
      if (mode === "IPv6Only") return isIpv6(String(proxy.server || ""));
      return true;
    })
    .map(({ proxy }) => proxy);
}

async function resolveProxyDomain(proxy: ProxyNode, filter: FilterRule, settings?: AppSettings) {
  const server = String(proxy.server || "");
  if (!shouldResolveServer(server)) return { proxy, resolved: false };

  try {
    const address = await resolveHostname(server, filter, settings);
    if (!address) return { proxy, resolved: false };
    return { proxy: preserveTlsServerName({ ...proxy, server: address }, server), resolved: true };
  } catch {
    return { proxy, resolved: false };
  }
}

function preserveTlsServerName(proxy: ProxyNode, originalServer: string) {
  const next = { ...proxy };
  if (proxy.type === "vless" || proxy.type === "vmess") {
    if (!next.servername) next.servername = originalServer;
  }
  if (["trojan", "hysteria", "hysteria2", "tuic", "anytls"].includes(String(proxy.type))) {
    if (!next.sni) next.sni = originalServer;
  }
  return next;
}

async function resolveHostname(hostname: string, filter: FilterRule, settings?: AppSettings) {
  const recordType = getResolveRecordType(filter);
  const url = getResolveEndpoint(filter, hostname, recordType);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getRequestTimeout(settings));
  try {
    const response = await fetch(url, {
      headers: { accept: "application/dns-json", "user-agent": stringSetting(settings?.defaultUserAgent) || "sub-store-cloudflare" },
      signal: controller.signal,
    });
    if (!response.ok) return "";
    const payload = parseDnsResponse(await readResponseText(response, MAX_DOH_RESPONSE_BYTES, "DNS response"));
    const answerType = recordType === "AAAA" ? 28 : 1;
    return (payload.Answer || [])
      .map((answer) => (answer.type === answerType ? String(answer.data || "") : ""))
      .find((item) => (recordType === "AAAA" ? isIpv6(item) : isIpv4(item))) || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseDnsResponse(text: string) {
  const payload: unknown = JSON.parse(text);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { Answer: [] };
  const answers = Reflect.get(payload, "Answer");
  if (!Array.isArray(answers)) return { Answer: [] };
  return {
    Answer: answers.flatMap((answer) => {
      if (!answer || typeof answer !== "object" || Array.isArray(answer)) return [];
      const type = Reflect.get(answer, "type");
      const data = Reflect.get(answer, "data");
      return [{ type: typeof type === "number" ? type : undefined, data: typeof data === "string" ? data : undefined }];
    }),
  };
}

function getResolveEndpoint(filter: FilterRule, hostname: string, recordType: "A" | "AAAA") {
  const provider = String(filter.provider || "Cloudflare");
  const baseUrl = provider === "Google"
    ? "https://dns.google/resolve"
    : provider === "Ali"
      ? "https://dns.alidns.com/resolve"
      : provider === "Tencent"
        ? "https://doh.pub/resolve"
        : provider === "Custom" && typeof filter.url === "string" && /^https:\/\//i.test(filter.url)
          ? filter.url
          : "https://cloudflare-dns.com/dns-query";
  const url = new URL(baseUrl);
  url.searchParams.set("name", hostname);
  url.searchParams.set("type", recordType);
  if (filter.edns && provider !== "Cloudflare") url.searchParams.set("edns_client_subnet", String(filter.edns));
  return url.toString();
}

function getResolveRecordType(filter: FilterRule): "A" | "AAAA" {
  const value = String(filter.recordType || filter.typeValue || filter.resolveType || filter["resolve-type"] || "").toUpperCase();
  if (value === "IPV6" || value === "AAAA") return "AAAA";
  return "A";
}

function getResolveConcurrency(filter: FilterRule, settings?: AppSettings) {
  return numberSetting(filter.concurrency, getRequestConcurrency(settings), 1, 12);
}

function shouldResolveServer(server: unknown) {
  const value = String(server || "").trim();
  return Boolean(value && !isIpAddress(value) && /^[a-z0-9.-]+$/i.test(value) && value.includes("."));
}

function isIpAddress(value: string) {
  return isIpv4(value) || isIpv6(value);
}

function isIpv4(value: string) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isIpv6(value: string) {
  return value.includes(":") && /^[0-9a-f:]+$/i.test(value);
}

function applyState(proxy: ProxyNode, key: string, value: unknown) {
  if (stateEnabled(value)) proxy[key] = true;
  if (stateDisabled(value)) proxy[key] = false;
}

function stateEnabled(value: unknown) {
  return value === true || value === "ENABLED" || value === "enabled";
}

function stateDisabled(value: unknown) {
  return value === false || value === "DISABLED" || value === "disabled";
}

function isUsefulProxy(proxy: ProxyNode) {
  if (!Number.isFinite(proxy.port) || Number(proxy.port) <= 0 || Number(proxy.port) > 65535) return false;
  if (proxy.cipher && !isAscii(String(proxy.cipher))) return false;
  if (proxy.password && !isAscii(String(proxy.password))) return false;
  const network = String(proxy.network || "");
  const host = network ? getByPath(proxy, `${network}-opts.headers.Host`) || getByPath(proxy, `${network}-opts.headers.host`) : undefined;
  const hosts = Array.isArray(host) ? host : [host];
  if (hosts.some((item) => item && !isAscii(String(item)))) return false;
  return !/网址|流量|时间|应急|过期|官网|剩余|Bandwidth|expire/i.test(proxy.name);
}

function isAscii(input: string) {
  return /^[\x00-\x7F]+$/.test(input);
}

function detectFlag(name: string) {
  const text = name.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/香港|港|hong\s*kong|\bhk\b/, "🇭🇰"],
    [/台湾|台灣|taiwan|\btw\b/, "🇹🇼"],
    [/新加坡|狮城|獅城|singapore|\bsg\b/, "🇸🇬"],
    [/日本|东京|東京|大阪|japan|tokyo|osaka|\bjp\b/, "🇯🇵"],
    [/美国|美國|洛杉矶|洛杉磯|纽约|紐約|united\s*states|los\s*angeles|new\s*york|\bus\b|\busa\b/, "🇺🇸"],
    [/英国|英國|伦敦|倫敦|united\s*kingdom|london|\buk\b/, "🇬🇧"],
    [/德国|德國|法兰克福|法蘭克福|germany|frankfurt|\bde\b/, "🇩🇪"],
    [/韩国|韓國|首尔|首爾|korea|seoul|\bkr\b/, "🇰🇷"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || "🏳️";
}

function removeFlag(name: string) {
  return name.replace(/^[\p{Regional_Indicator}\uFE0F\u200D\s]+/u, "").replace(/^[🏳️]+\s*/u, "");
}

function normalizeTaiwanFlag(flag: string, mode: string) {
  if (flag !== "🇹🇼") return flag;
  if (mode === "ws") return "🇼🇸";
  if (mode === "tw") return "🇹🇼";
  return "🇨🇳";
}

export function ensureUniqueProxyNames(proxies: ProxyNode[]) {
  const used = new Set<string>();
  const nextSuffix = new Map<string, number>();
  return proxies.map((proxy) => {
    let name = proxy.name;
    if (used.has(name)) {
      // Check the emitted names, not just the inputs, so `A, A, A-2` cannot end
      // up with two `A-2` entries. Names are only added, so the next suffix can
      // resume where the previous collision stopped.
      let suffix = nextSuffix.get(proxy.name) ?? 2;
      while (used.has(`${proxy.name}-${suffix}`)) suffix += 1;
      name = `${proxy.name}-${suffix}`;
      nextSuffix.set(proxy.name, suffix + 1);
    }
    used.add(name);
    return name === proxy.name ? proxy : { ...proxy, name };
  });
}
