import type { ProxyNode } from "../../../types";
import {
  appendPluginOptions,
  appendWsOptions,
  commonTextOptions,
  joinTextProxy,
  renderTextProxyList,
  sanitizeTextProxyName,
} from "./text";

export function renderSurgeProxies(proxies: ProxyNode[]) {
  return renderTextProxyList(proxies, "surge", toSurgeProxyLine);
}

export function renderSurgeMacProxies(proxies: ProxyNode[]) {
  return renderTextProxyList(proxies, "surge-mac", toSurgeMacProxyLine);
}

export function renderSurfboardProxies(proxies: ProxyNode[]) {
  return renderTextProxyList(proxies, "surfboard", toSurfboardProxyLine);
}

function toSurgeProxyLine(proxy: ProxyNode) {
  const name = sanitizeTextProxyName(proxy.name);
  const base = `${name}=${surgeType(proxy)},${proxy.server},${proxy.port}`;
  const entries = commonTextOptions(proxy);

  if (proxy.type === "ss") {
    entries.unshift(["encrypt-method", proxy.cipher || "none"], ["password", proxy.password]);
    appendPluginOptions(entries, proxy, "surge");
    return joinTextProxy(base, entries);
  }
  if (proxy.type === "vmess") {
    entries.unshift(["username", proxy.uuid], ["encrypt-method", proxy.cipher || "auto"], ["tls", proxy.tls], ["sni", proxy.servername]);
    appendWsOptions(entries, proxy, "surge");
    return joinTextProxy(base, entries);
  }
  if (proxy.type === "trojan") {
    entries.unshift(["password", proxy.password], ["sni", proxy.sni || proxy.servername]);
    return joinTextProxy(base, entries);
  }
  if (proxy.type === "http" || proxy.type === "socks5") {
    entries.unshift(["username", proxy.username], ["password", proxy.password], ["tls", proxy.tls], ["sni", proxy.sni || proxy.servername]);
    return joinTextProxy(base, entries);
  }
  if (proxy.type === "hysteria2") {
    entries.unshift(["password", proxy.password], ["sni", proxy.sni]);
    if (proxy.obfs) entries.push(["obfs", proxy.obfs], ["obfs-password", proxy["obfs-password"]]);
    return joinTextProxy(base, entries);
  }
  if (proxy.type === "tuic") {
    entries.unshift(["uuid", proxy.uuid], ["password", proxy.password], ["sni", proxy.sni]);
    return joinTextProxy(`${name}=tuic-v5,${proxy.server},${proxy.port}`, entries);
  }
  if (proxy.type === "anytls") {
    entries.unshift(["password", proxy.password], ["sni", proxy.sni || proxy.servername]);
    return joinTextProxy(base, entries);
  }
  if (proxy.type === "snell") {
    entries.unshift(["psk", proxy.psk || proxy.password], ["version", proxy.version || 3]);
    return joinTextProxy(`${name}=snell,${proxy.server},${proxy.port}`, entries);
  }
  return undefined;
}

function toSurgeMacProxyLine(proxy: ProxyNode) {
  if (proxy.type === "ssh") {
    const entries = commonTextOptions(proxy);
    entries.unshift(["username", proxy.username], ["password", proxy.password], ["private-key", proxy["private-key"]]);
    return joinTextProxy(`${sanitizeTextProxyName(proxy.name)}=ssh,${proxy.server},${proxy.port}`, entries);
  }
  if (proxy.type === "snell") {
    const entries = commonTextOptions(proxy);
    entries.unshift(["psk", proxy.psk || proxy.password], ["version", proxy.version || 3]);
    return joinTextProxy(`${sanitizeTextProxyName(proxy.name)}=snell,${proxy.server},${proxy.port}`, entries);
  }
  if (proxy.type === "h2-connect") {
    const entries = commonTextOptions(proxy);
    entries.unshift(["username", proxy.username], ["password", proxy.password], ["tls", proxy.tls], ["sni", proxy.sni || proxy.servername]);
    return joinTextProxy(`${sanitizeTextProxyName(proxy.name)}=h2-connect,${proxy.server},${proxy.port}`, entries);
  }
  return toSurgeProxyLine(proxy);
}

function toSurfboardProxyLine(proxy: ProxyNode) {
  return ["ss", "vmess", "trojan", "http", "socks5"].includes(proxy.type)
    ? toSurgeProxyLine(proxy)
    : undefined;
}

function surgeType(proxy: ProxyNode) {
  if (proxy.type === "socks5") return proxy.tls ? "socks5-tls" : "socks5";
  if (proxy.type === "http") return proxy.tls ? "https" : "http";
  return proxy.type;
}
