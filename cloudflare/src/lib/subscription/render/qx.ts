import type { ProxyNode } from "../../../types";
import {
  commonTextOptions,
  joinTextProxy,
  renderTextProxyList,
  wsHeaderHost,
} from "./text";

export function renderQxProxies(proxies: ProxyNode[]) {
  return renderTextProxyList(proxies, "qx", toQxProxyLine);
}

function toQxProxyLine(proxy: ProxyNode) {
  const entries = commonTextOptions(proxy);
  entries.push(["tag", sanitizeQxTag(proxy.name)]);

  if (proxy.type === "ss") {
    entries.unshift(["method", proxy.cipher || "none"], ["password", proxy.password]);
    appendQxObfs(entries, proxy);
    return joinTextProxy(`shadowsocks=${proxy.server}:${proxy.port}`, entries);
  }
  if (proxy.type === "ssr") {
    entries.unshift(["method", proxy.cipher || "aes-256-cfb"], ["password", proxy.password], ["ssr-protocol", proxy.protocol || "origin"], ["obfs", proxy.obfs || "plain"]);
    return joinTextProxy(`shadowsocks=${proxy.server}:${proxy.port}`, entries);
  }
  if (proxy.type === "vmess" || proxy.type === "vless") {
    entries.unshift(["method", proxy.type === "vmess" ? proxy.cipher || "auto" : "none"], ["password", proxy.uuid], ["over-tls", proxy.tls], ["tls-host", proxy.servername], ["flow", proxy.flow]);
    appendQxTransport(entries, proxy);
    appendQxRealityOptions(entries, proxy);
    return joinTextProxy(`${proxy.type}=${proxy.server}:${proxy.port}`, entries);
  }
  if (proxy.type === "trojan" || proxy.type === "anytls") {
    entries.unshift(["password", proxy.password], ["over-tls", true], ["tls-host", proxy.sni || proxy.servername]);
    appendQxRealityOptions(entries, proxy);
    return joinTextProxy(`${proxy.type}=${proxy.server}:${proxy.port}`, entries);
  }
  if (proxy.type === "http" || proxy.type === "socks5") {
    entries.unshift(["username", proxy.username], ["password", proxy.password], ["over-tls", proxy.tls]);
    return joinTextProxy(`${proxy.type === "socks5" ? "socks5" : "http"}=${proxy.server}:${proxy.port}`, entries);
  }
  return undefined;
}

function appendQxRealityOptions(entries: Array<[string, unknown]>, proxy: ProxyNode) {
  const realityOpts = proxy["reality-opts"] as Record<string, unknown> | undefined;
  entries.push(["reality-base64-pubkey", realityOpts?.["public-key"]], ["reality-hex-shortid", realityOpts?.["short-id"]]);
}

function appendQxObfs(entries: Array<[string, unknown]>, proxy: ProxyNode) {
  const pluginOpts = proxy["plugin-opts"] as Record<string, unknown> | undefined;
  if (proxy.plugin === "obfs" && pluginOpts) entries.push(["obfs", pluginOpts.mode], ["obfs-host", pluginOpts.host], ["obfs-uri", pluginOpts.path]);
}

function appendQxTransport(entries: Array<[string, unknown]>, proxy: ProxyNode) {
  if (proxy.network !== "ws") return;
  const wsOpts = proxy["ws-opts"] as { path?: unknown; headers?: Record<string, unknown> } | undefined;
  entries.push(["obfs", proxy.tls ? "wss" : "ws"], ["obfs-uri", wsOpts?.path || "/"], ["obfs-host", wsHeaderHost(wsOpts)]);
}

function sanitizeQxTag(name: string) {
  return name.replace(/[,\r\n]/g, " ").trim() || "proxy";
}
