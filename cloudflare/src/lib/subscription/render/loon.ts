import type { ProxyNode } from "../../../types";
import {
  appendPluginOptions,
  appendRealityOptions,
  appendWsOptions,
  commonTextOptions,
  joinTextProxy,
  quoteTextValue,
  renderTextProxyList,
  sanitizeTextProxyName,
} from "./text";

export function renderLoonProxies(proxies: ProxyNode[]) {
  return renderTextProxyList(proxies, "loon", toLoonProxyLine);
}

function toLoonProxyLine(proxy: ProxyNode) {
  const name = sanitizeTextProxyName(proxy.name);
  const entries = commonTextOptions(proxy);

  if (proxy.type === "ss") {
    appendPluginOptions(entries, proxy, "loon");
    return joinTextProxy(`${name}=shadowsocks,${proxy.server},${proxy.port},${proxy.cipher || "none"},${quoteTextValue(proxy.password)}`, entries);
  }
  if (proxy.type === "ssr") {
    return joinTextProxy(
      `${name}=shadowsocksr,${proxy.server},${proxy.port},${proxy.cipher || "aes-256-cfb"},${quoteTextValue(proxy.password)},${proxy.protocol || "origin"},${proxy.obfs || "plain"}`,
      entries,
    );
  }
  if (proxy.type === "vmess" || proxy.type === "vless") {
    entries.unshift(["transport", proxy.network || "tcp"], ["over-tls", proxy.tls], ["sni", proxy.servername], ["flow", proxy.flow]);
    appendWsOptions(entries, proxy, "loon");
    appendRealityOptions(entries, proxy);
    const method = proxy.type === "vmess" ? proxy.cipher || "auto" : "none";
    return joinTextProxy(`${name}=${proxy.type},${proxy.server},${proxy.port},${method},${quoteTextValue(proxy.uuid)}`, entries);
  }
  if (proxy.type === "trojan" || proxy.type === "anytls") {
    entries.unshift(["sni", proxy.sni || proxy.servername]);
    appendRealityOptions(entries, proxy);
    return joinTextProxy(`${name}=${proxy.type},${proxy.server},${proxy.port},${quoteTextValue(proxy.password)}`, entries);
  }
  if (proxy.type === "http" || proxy.type === "socks5") {
    entries.unshift(["username", proxy.username], ["password", proxy.password], ["over-tls", proxy.tls], ["sni", proxy.sni || proxy.servername]);
    return joinTextProxy(`${name}=${proxy.type === "socks5" ? "socks5" : "http"},${proxy.server},${proxy.port}`, entries);
  }
  if (proxy.type === "hysteria2") {
    entries.unshift(["tls-name", proxy.sni], ["obfs", proxy.obfs], ["obfs-password", proxy["obfs-password"]]);
    return joinTextProxy(`${name}=Hysteria2,${proxy.server},${proxy.port},${quoteTextValue(proxy.password)}`, entries);
  }
  return undefined;
}
