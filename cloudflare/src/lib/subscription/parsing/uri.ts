import type { ProxyNode } from "../../../types";
import { commaList, decodeBase64UrlText, stripUndefined, stringSetting } from "../utils";

export function parseProxyUri(line: string, index: number): ProxyNode | undefined {
  try {
    if (line.startsWith("vless://")) return parseVless(line, index);
    if (line.startsWith("anytls://")) return parseAnytls(line, index);
    if (line.startsWith("hysteria://") || line.startsWith("hy://")) return parseHysteria(line, index);
    if (line.startsWith("hysteria2://") || line.startsWith("hy2://")) return parseHysteria2(line, index);
    if (line.startsWith("trojan://")) return parseTrojan(line, index);
    if (line.startsWith("vmess://")) return parseVmess(line, index);
    if (line.startsWith("ss://")) return parseShadowsocks(line, index);
    if (line.startsWith("ssr://")) return parseShadowsocksR(line, index);
    if (line.startsWith("socks://") || line.startsWith("socks5://") || line.startsWith("socks5+tls://")) return parseSocks(line, index);
    if (line.startsWith("tuic://")) return parseTuic(line, index);
    if (line.startsWith("wireguard://") || line.startsWith("wg://")) return parseWireGuard(line, index);
    if (line.startsWith("http://") || line.startsWith("https://")) return parseHttpProxy(line, index);
    return undefined;
  } catch {
    return undefined;
  }
}

function parseVless(line: string, index: number): ProxyNode {
  const url = new URL(line);
  const params = url.searchParams;
  const publicKey = params.get("pbk") || params.get("public-key");
  const shortId = params.get("sid") || params.get("short-id");
  const security = params.get("security") || (publicKey ? "reality" : "tls");

  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `vless-${index + 1}`),
    type: "vless",
    server: url.hostname,
    port: Number(url.port || 443),
    uuid: decodeURIComponent(url.username),
    udp: true,
    flow: params.get("flow") || undefined,
    network: params.get("type") || "tcp",
    ...uriTransportOptions(params),
    tls: security !== "none",
    servername: params.get("sni") || undefined,
    encryption: params.get("encryption") || "none",
    "client-fingerprint": params.get("fp") || "chrome",
    "reality-opts": publicKey ? stripUndefined({ "public-key": publicKey, "short-id": shortId, "spider-x": params.get("spx") || "/" }) : undefined,
  });
}

// VLESS and trojan share links carry the transport in the same `type` /
// `path` / `host` / `serviceName` parameters, so keep the Clash-shaped
// options in one place instead of dropping them.
function uriTransportOptions(params: URLSearchParams) {
  const network = params.get("type") || "tcp";
  const host = params.get("host");
  if (network === "ws") {
    return { "ws-opts": stripUndefined({ path: params.get("path") || "/", headers: host ? { Host: host } : undefined }) };
  }
  if (network === "grpc") {
    return { "grpc-opts": stripUndefined({ "grpc-service-name": params.get("serviceName") || params.get("path") || undefined }) };
  }
  if (network === "h2" || network === "http") {
    return { "h2-opts": stripUndefined({ host: host ? [host] : undefined, path: params.get("path") || undefined }) };
  }
  return {};
}

function parseAnytls(line: string, index: number): ProxyNode {
  const url = new URL(line);
  const params = url.searchParams;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `anytls-${index + 1}`),
    type: "anytls",
    server: url.hostname,
    port: Number(url.port || 443),
    password: decodeURIComponent(url.username),
    sni: params.get("sni") || params.get("peer") || undefined,
    "skip-cert-verify": boolParam(params.get("insecure") || params.get("allowInsecure")),
    "client-fingerprint": params.get("fp") || "chrome",
  });
}

function parseHysteria2(line: string, index: number): ProxyNode {
  const url = new URL(line.replace(/^hy2:\/\//, "hysteria2://"));
  const params = url.searchParams;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `hysteria2-${index + 1}`),
    type: "hysteria2",
    server: url.hostname,
    port: Number(url.port || 443),
    password: decodeURIComponent(url.username),
    sni: params.get("sni") || params.get("peer") || undefined,
    "skip-cert-verify": boolParam(params.get("insecure") || params.get("allowInsecure")),
    obfs: params.get("obfs") || undefined,
    "obfs-password": params.get("obfs-password") || params.get("salamander-password") || undefined,
  });
}

function parseHysteria(line: string, index: number): ProxyNode {
  const url = new URL(line.replace(/^hy:\/\//, "hysteria://"));
  const params = url.searchParams;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `hysteria-${index + 1}`),
    type: "hysteria",
    server: url.hostname,
    port: Number(url.port || 443),
    // Mihomo/Stash spell this `auth-str`; sing-box's `auth_str` is converted at
    // render time instead of leaking into the YAML output.
    "auth-str": decodeURIComponent(url.username || params.get("auth") || params.get("auth_str") || params.get("auth-str") || ""),
    protocol: params.get("protocol") || undefined,
    up: params.get("up") || params.get("upmbps") || undefined,
    down: params.get("down") || params.get("downmbps") || undefined,
    sni: params.get("sni") || params.get("peer") || undefined,
    alpn: commaList(params.get("alpn")),
    obfs: params.get("obfs") || undefined,
    "obfs-password": params.get("obfs-password") || undefined,
    "skip-cert-verify": boolParam(params.get("insecure") || params.get("allowInsecure")),
  });
}

function parseTrojan(line: string, index: number): ProxyNode {
  const url = new URL(line);
  const params = url.searchParams;
  const network = params.get("type");
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `trojan-${index + 1}`),
    type: "trojan",
    server: url.hostname,
    port: Number(url.port || 443),
    password: decodeURIComponent(url.username),
    sni: params.get("sni") || params.get("peer") || undefined,
    "skip-cert-verify": boolParam(params.get("allowInsecure")),
    udp: true,
    ...(network ? { network } : {}),
    ...uriTransportOptions(params),
  });
}

function parseVmess(line: string, index: number): ProxyNode | undefined {
  try {
    // The payload is UTF-8 JSON in base64 (standard or URL-safe), so decode it
    // as text; `atob` alone turns non-ASCII node names into mojibake.
    const payload = JSON.parse(decodeBase64UrlText(line.slice("vmess://".length)));
    return stripUndefined({
      name: payload.ps || `vmess-${index + 1}`,
      type: "vmess",
      server: payload.add,
      port: Number(payload.port),
      uuid: payload.id,
      alterId: Number(payload.aid || 0),
      cipher: payload.scy || "auto",
      tls: payload.tls === "tls",
      servername: payload.sni || payload.host || undefined,
      network: payload.net || "tcp",
      "ws-opts": payload.net === "ws" ? { path: payload.path || "/", headers: { Host: payload.host } } : undefined,
      udp: true,
    });
  } catch {
    return undefined;
  }
}

function parseShadowsocks(line: string, index: number): ProxyNode | undefined {
  try {
    const withoutScheme = line.slice("ss://".length);
    const hashIndex = withoutScheme.indexOf("#");
    const mainWithQuery = hashIndex >= 0 ? withoutScheme.slice(0, hashIndex) : withoutScheme;
    const hash = hashIndex >= 0 ? withoutScheme.slice(hashIndex + 1) : "";
    const queryIndex = mainWithQuery.indexOf("?");
    const main = queryIndex >= 0 ? mainWithQuery.slice(0, queryIndex) : mainWithQuery;
    const params = new URLSearchParams(queryIndex >= 0 ? mainWithQuery.slice(queryIndex + 1) : "");

    // SIP002 keeps `BASE64(method:password)@host:port`, while older links
    // base64 the whole `method:password@host:port` string.
    const decodedMain = main.includes("@") ? main : decodeBase64UrlText(main);
    const atIndex = decodedMain.lastIndexOf("@");
    if (atIndex <= 0) return undefined;
    const userInfo = decodedMain.slice(0, atIndex);
    const hostInfo = decodedMain.slice(atIndex + 1);
    const decodedUserInfo = userInfo.includes(":") ? userInfo : decodeBase64UrlText(userInfo);
    const colonIndex = decodedUserInfo.indexOf(":");
    if (colonIndex <= 0) return undefined;

    const lastColon = hostInfo.lastIndexOf(":");
    if (lastColon <= 0) return undefined;
    const port = Number(hostInfo.slice(lastColon + 1).split("/")[0]);
    if (!Number.isFinite(port)) return undefined;

    return stripUndefined({
      name: decodeURIComponent(hash || `ss-${index + 1}`),
      type: "ss",
      server: hostInfo.slice(0, lastColon),
      port,
      cipher: decodedUserInfo.slice(0, colonIndex),
      password: decodeUriComponentSafe(decodedUserInfo.slice(colonIndex + 1)),
      ...ssPluginOptions(params.get("plugin")),
      udp: true,
    });
  } catch {
    return undefined;
  }
}

// `plugin` follows the SIP003 form `name;key=value;flag`, with the obfs and
// v2ray plugins mapping onto Mihomo's `plugin` / `plugin-opts` fields.
type SsPluginFields = { plugin?: string; "plugin-opts"?: Record<string, unknown> };

function ssPluginOptions(value: string | null): SsPluginFields {
  const text = stringSetting(value);
  if (!text) return {};
  const [rawName, ...parts] = text.split(";").map((part) => part.trim()).filter(Boolean);
  const name = (rawName || "").toLowerCase();
  const options: Record<string, string | boolean> = {};
  for (const part of parts) {
    const equalIndex = part.indexOf("=");
    if (equalIndex > 0) options[part.slice(0, equalIndex).trim().toLowerCase()] = part.slice(equalIndex + 1).trim();
    else options[part.toLowerCase()] = true;
  }

  if (name === "obfs-local" || name === "simple-obfs" || name === "obfs") {
    return {
      plugin: "obfs",
      "plugin-opts": stripUndefined({
        mode: stringSetting(options.obfs) || stringSetting(options.mode) || "http",
        host: stringSetting(options["obfs-host"]) || stringSetting(options.host),
      }),
    };
  }

  if (name === "v2ray-plugin") {
    return {
      plugin: "v2ray-plugin",
      "plugin-opts": stripUndefined({
        mode: stringSetting(options.mode) || "websocket",
        host: stringSetting(options.host),
        path: stringSetting(options.path),
        tls: options.tls === true || options.tls === "true" ? true : undefined,
        mux: options.mux === true || options.mux === "true" ? true : undefined,
      }),
    };
  }

  return {
    plugin: name || undefined,
    "plugin-opts": Object.keys(options).length > 0 ? options : undefined,
  };
}

function decodeUriComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseShadowsocksR(line: string, index: number): ProxyNode | undefined {
  try {
    const decoded = decodeBase64UrlText(line.slice("ssr://".length));
    const [main, rawQuery = ""] = decoded.split("/?");
    const [server, port, protocol, method, obfs, encodedPassword] = main.split(":");
    const query = new URLSearchParams(rawQuery);
    const remarks = query.get("remarks");
    return stripUndefined({
      name: remarks ? decodeBase64UrlText(remarks) : `ssr-${index + 1}`,
      type: "ssr",
      server,
      port: Number(port),
      cipher: method,
      password: decodeBase64UrlText(encodedPassword || ""),
      protocol,
      "protocol-param": query.get("protoparam") ? decodeBase64UrlText(query.get("protoparam") || "") : undefined,
      obfs,
      "obfs-param": query.get("obfsparam") ? decodeBase64UrlText(query.get("obfsparam") || "") : undefined,
      udp: true,
    });
  } catch {
    return undefined;
  }
}

function parseSocks(line: string, index: number): ProxyNode | undefined {
  const normalizedLine = line.replace(/^socks:\/\//, "socks5://").replace(/^socks5\+tls:\/\//, "socks5://");
  const url = new URL(normalizedLine);
  if (!url.port) return undefined;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `socks5-${index + 1}`),
    type: "socks5",
    server: url.hostname,
    port: Number(url.port),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    tls: line.startsWith("socks5+tls://") || boolParam(url.searchParams.get("tls")),
    udp: true,
  });
}

function parseHttpProxy(line: string, index: number): ProxyNode | undefined {
  const url = new URL(line);
  if (!url.port) return undefined;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `${url.protocol === "https:" ? "https" : "http"}-${index + 1}`),
    type: "http",
    server: url.hostname,
    port: Number(url.port),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    tls: url.protocol === "https:",
  });
}

function parseTuic(line: string, index: number): ProxyNode {
  const url = new URL(line);
  const params = url.searchParams;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `tuic-${index + 1}`),
    type: "tuic",
    server: url.hostname,
    port: Number(url.port || 443),
    uuid: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    sni: params.get("sni") || undefined,
    alpn: commaList(params.get("alpn")),
    "skip-cert-verify": boolParam(params.get("allow_insecure") || params.get("insecure")),
    "disable-sni": boolParam(params.get("disable_sni") || params.get("disable-sni")),
    "reduce-rtt": boolParam(params.get("reduce_rtt") || params.get("reduce-rtt")),
    "udp-relay-mode": params.get("udp_relay_mode") || params.get("udp-relay-mode") || undefined,
    "congestion-controller": params.get("congestion_control") || params.get("congestion-controller") || undefined,
  });
}

function parseWireGuard(line: string, index: number): ProxyNode {
  const url = new URL(line.replace(/^wg:\/\//, "wireguard://"));
  const params = url.searchParams;
  return stripUndefined({
    name: decodeURIComponent(url.hash.slice(1) || `wireguard-${index + 1}`),
    type: "wireguard",
    server: url.hostname,
    port: Number(url.port || 51820),
    ip: params.get("ip") || params.get("address") || undefined,
    ipv6: params.get("ipv6") || undefined,
    "private-key": decodeURIComponent(url.username || params.get("private-key") || params.get("privatekey") || ""),
    "public-key": params.get("public-key") || params.get("publickey") || params.get("peer-public-key") || undefined,
    "pre-shared-key": params.get("pre-shared-key") || params.get("presharedkey") || params.get("psk") || undefined,
    reserved: params.get("reserved") || undefined,
    udp: true,
  });
}

function boolParam(value: string | null) {
  return value === "1" || value === "true";
}
