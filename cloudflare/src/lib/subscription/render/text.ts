import type { ProxyNode } from "../../../types";
import { stringSetting } from "../utils";

export function renderTextProxyList(proxies: ProxyNode[], target: string, producer: (proxy: ProxyNode) => string | undefined) {
  const lines = proxies.map(producer).filter((line): line is string => Boolean(line));
  if (lines.length === 0) throw new Error(`No supported nodes for ${target} output`);
  return lines.join("\n");
}

export function commonTextOptions(proxy: ProxyNode): Array<[string, unknown]> {
  return [
    ["skip-cert-verify", proxy["skip-cert-verify"]],
    ["udp-relay", proxy.udp],
    ["fast-open", proxy.tfo || proxy["fast-open"]],
    ["alpn", formatAlpn(proxy.alpn)],
  ];
}

export function appendWsOptions(entries: Array<[string, unknown]>, proxy: ProxyNode, target: "surge" | "loon") {
  const wsOpts = proxy["ws-opts"] as { path?: unknown; headers?: Record<string, unknown> } | undefined;
  if (proxy.network !== "ws") return;
  if (target === "surge") {
    entries.push(["ws", true], ["ws-path", wsOpts?.path || "/"], ["ws-headers", wsHeaderHost(wsOpts)]);
  } else {
    entries.push(["path", wsOpts?.path || "/"], ["host", wsHeaderHost(wsOpts)]);
  }
}

export function appendPluginOptions(entries: Array<[string, unknown]>, proxy: ProxyNode, target: "surge" | "loon") {
  const pluginOpts = proxy["plugin-opts"] as Record<string, unknown> | undefined;
  if (proxy.plugin !== "obfs" || !pluginOpts) return;
  if (target === "surge") {
    entries.push(["obfs", pluginOpts.mode], ["obfs-host", pluginOpts.host], ["obfs-uri", pluginOpts.path]);
  } else {
    entries.push(["obfs-name", pluginOpts.mode], ["obfs-host", pluginOpts.host], ["obfs-uri", pluginOpts.path]);
  }
}

export function appendRealityOptions(entries: Array<[string, unknown]>, proxy: ProxyNode) {
  const realityOpts = proxy["reality-opts"] as Record<string, unknown> | undefined;
  entries.push(["public-key", realityOpts?.["public-key"]], ["short-id", realityOpts?.["short-id"]]);
}

export function joinTextProxy(base: string, entries: Array<[string, unknown]>) {
  const suffix = entries
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${formatTextOptionValue(value)}`)
    .join(",");
  return suffix ? `${base},${suffix}` : base;
}

function formatTextOptionValue(value: unknown) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return quoteTextValue(value.join(","));
  const text = String(value);
  return /[,\s"]/.test(text) ? quoteTextValue(text) : text;
}

export function quoteTextValue(value: unknown) {
  return `"${String(value || "").replace(/"/g, '\\"')}"`;
}

export function sanitizeTextProxyName(name: string) {
  return name.replace(/[=,\r\n]/g, " ").trim() || "proxy";
}

export function wsHeaderHost(wsOpts: { headers?: Record<string, unknown> } | undefined) {
  return wsOpts?.headers?.Host || wsOpts?.headers?.host;
}

export function formatAlpn(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(",");
  return stringSetting(value);
}
