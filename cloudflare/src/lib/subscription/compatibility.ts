import type { ProxyNode, SubscriptionTarget } from "../../types";

export function getTargetContentType(target: SubscriptionTarget) {
  if (target === "sing-box" || target === "json") return "application/json; charset=utf-8";
  if (target === "v2ray" || target === "uri" || target === "surge" || target === "surge-mac" || target === "surfboard" || target === "loon" || target === "shadowrocket" || target === "qx") return "text/plain; charset=utf-8";
  return "text/yaml; charset=utf-8";
}

export function isTargetCompatible(proxy: ProxyNode, target: SubscriptionTarget) {
  if (target === "mihomo" || target === "stash" || target === "json") return true;
  const commonUri = ["ss", "ssr", "vmess", "vless", "trojan", "hysteria", "hysteria2", "tuic", "anytls", "http", "socks5", "wireguard"];
  if (target === "uri" || target === "v2ray" || target === "shadowrocket") return commonUri.includes(proxy.type);
  if (target === "sing-box") return ["ss", "vmess", "vless", "trojan", "hysteria", "hysteria2", "tuic", "anytls", "http", "socks5", "wireguard"].includes(proxy.type);
  if (target === "surge") return ["ss", "vmess", "trojan", "http", "socks5", "hysteria2", "tuic", "anytls", "snell"].includes(proxy.type);
  if (target === "surge-mac") return ["ss", "vmess", "trojan", "http", "socks5", "hysteria2", "tuic", "anytls", "snell", "ssh", "h2-connect"].includes(proxy.type);
  if (target === "surfboard") return ["ss", "vmess", "trojan", "http", "socks5"].includes(proxy.type);
  if (target === "loon") return ["ss", "ssr", "vmess", "vless", "trojan", "http", "socks5", "hysteria2", "tuic", "anytls", "wireguard"].includes(proxy.type);
  if (target === "qx") return ["ss", "ssr", "vmess", "vless", "trojan", "http", "socks5", "anytls"].includes(proxy.type);
  if (target === "egern") return ["ss", "vmess", "trojan", "http", "socks5", "hysteria2", "tuic", "anytls"].includes(proxy.type);
  return false;
}
