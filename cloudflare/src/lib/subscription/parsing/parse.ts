import JSON5 from "json5";
import { parse as parseYaml } from "yaml";
import type { ProxyNode } from "../../../types";
import { stripUndefined } from "../utils";
import { parseClientProxyLine } from "./clients";
import { parseProxyUri } from "./uri";

export function decodeMaybeBase64(raw: string) {
  const text = raw.trim();
  if (looksLikeStructuredSubscription(text)) return raw;

  try {
    const decoded = atob(text.replace(/\s+/g, ""));
    if (looksLikeStructuredSubscription(decoded.trim())) return decoded;
  } catch {
    // Non-base64 subscriptions are parsed as-is.
  }
  return raw;
}

function looksLikeStructuredSubscription(text: string) {
  return (
    /^[a-z][a-z0-9+.-]*:\/\//im.test(text)
    || /^\s*(proxies|proxy-groups|rules)\s*:/m.test(text)
    || /^\s*[\[{]/.test(text)
    || /^\s*(shadowsocks|vmess|vless|trojan|http|socks5|anytls)\s*=/im.test(text)
    || /^\s*[^=\n]{1,80}\s*=\s*(ss|shadowsocks|ssr|vmess|vless|trojan|http|https|socks5|socks5-tls|hysteria2|hysteria|anytls|tuic|tuic-v5)\s*,/im.test(text)
  );
}

export function parseProxies(raw: string): ProxyNode[] {
  const text = raw.trim();
  if (!text) return [];
  if (/^\s*[\[{]/.test(text)) return parseJsonProxies(text);
  if (/^\s*proxies\s*:/m.test(text)) return parseYamlProxies(text);
  return parseProxyLines(text);
}

export function addPreviewIds(proxies: ProxyNode[]) {
  return proxies.map((proxy, index) => ({
    id: stableProxyId(proxy, index),
    ...proxy,
  }));
}

function stableProxyId(proxy: ProxyNode, index: number) {
  return [proxy.name, proxy.type, proxy.server || "", proxy.port || "", index].join("|");
}

function parseJsonProxies(raw: string) {
  try {
    const payload = JSON5.parse(raw);
    const proxies = Array.isArray(payload) ? payload : Array.isArray(payload.proxies) ? payload.proxies : [];
    return proxies.map(normalizeProxy).filter(isProxyNode);
  } catch {
    return [];
  }
}

function parseYamlProxies(raw: string) {
  try {
    const payload = parseYaml(raw) as { proxies?: unknown };
    const proxies = Array.isArray(payload?.proxies) ? payload.proxies : [];
    return proxies.map(normalizeProxy).filter(isProxyNode);
  } catch {
    return [];
  }
}

function parseProxyLines(raw: string) {
  const proxies: ProxyNode[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#") || text.startsWith(";") || /^\[[^\]]+\]$/.test(text)) continue;
    // The index counts parsed nodes, not raw lines, so default names stay
    // stable when comments or section headers are present.
    const proxy = parseProxyUri(text, proxies.length) || parseClientProxyLine(text, proxies.length);
    if (isProxyNode(proxy)) proxies.push(proxy);
  }
  return proxies;
}

function normalizeProxy(input: unknown): ProxyNode | undefined {
  if (!input || typeof input !== "object") return undefined;
  const proxy = input as Record<string, unknown>;
  return stripUndefined({
    ...proxy,
    name: String(proxy.name || ""),
    type: String(proxy.type || ""),
    port: proxy.port === undefined ? undefined : Number(proxy.port),
  });
}

function isProxyNode(input: ProxyNode | undefined): input is ProxyNode {
  return Boolean(input?.name && input.type);
}

export function formatInvalidLocalContentError(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const samples = lines.slice(0, 5).map((line, index) => `${index + 1}. ${line.slice(0, 80)}`);
  return ["No valid proxy nodes found. Supported input: URI lines, Mihomo YAML, or JSON proxy arrays.", samples.length ? `First lines:\n${samples.join("\n")}` : ""]
    .filter(Boolean)
    .join("\n");
}
