import { stringify as stringifyYaml } from "yaml";
import type { ProxyNode } from "../../../types";
import { stripUndefined } from "../utils";

export function renderEgernYaml(proxies: ProxyNode[]) {
  const list = proxies.map(toEgernProxy).filter((proxy) => Boolean(proxy));
  if (list.length === 0) throw new Error("No supported nodes for egern output");
  return stringifyYaml({ proxies: list });
}

function toEgernProxy(proxy: ProxyNode) {
  const common = stripUndefined({
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    tfo: proxy.tfo,
    udp_relay: proxy.udp,
  });

  if (proxy.type === "ss") {
    return stripUndefined({ ...common, type: "shadowsocks", method: proxy.cipher, password: proxy.password });
  }
  if (proxy.type === "vmess" || proxy.type === "vless") {
    return stripUndefined({
      ...common,
      type: proxy.type,
      uuid: proxy.uuid,
      alter_id: proxy.alterId,
      security: proxy.type === "vmess" ? proxy.cipher || "auto" : undefined,
      flow: proxy.flow,
      tls: proxy.tls,
      sni: proxy.servername,
      network: proxy.network,
      ws_opts: egernWsOptions(proxy),
      reality: egernRealityOptions(proxy),
    });
  }
  if (proxy.type === "trojan" || proxy.type === "anytls" || proxy.type === "hysteria2") {
    return stripUndefined({
      ...common,
      type: proxy.type,
      password: proxy.password,
      sni: proxy.sni || proxy.servername,
      skip_tls_verify: proxy["skip-cert-verify"],
      obfs: proxy.obfs,
      obfs_password: proxy["obfs-password"],
      reality: egernRealityOptions(proxy),
    });
  }
  if (proxy.type === "http" || proxy.type === "socks5") {
    return stripUndefined({
      ...common,
      type: proxy.type === "http" && proxy.tls ? "https" : proxy.tls ? "socks5_tls" : proxy.type,
      username: proxy.username,
      password: proxy.password,
      skip_tls_verify: proxy["skip-cert-verify"],
    });
  }
  if (proxy.type === "tuic") {
    return stripUndefined({
      ...common,
      type: "tuic",
      uuid: proxy.uuid,
      password: proxy.password,
      sni: proxy.sni,
      skip_tls_verify: proxy["skip-cert-verify"],
    });
  }
  if (proxy.type === "wireguard") {
    return stripUndefined({
      ...common,
      type: "wireguard",
      private_key: proxy["private-key"],
      public_key: proxy["public-key"],
      pre_shared_key: proxy["pre-shared-key"],
      address: proxy.ip,
      ipv6_address: proxy.ipv6,
    });
  }
  return undefined;
}

function egernWsOptions(proxy: ProxyNode) {
  const wsOpts = proxy["ws-opts"] as { path?: unknown; headers?: Record<string, unknown> } | undefined;
  if (proxy.network !== "ws") return undefined;
  return stripUndefined({ path: wsOpts?.path || "/", headers: wsOpts?.headers });
}

function egernRealityOptions(proxy: ProxyNode) {
  const realityOpts = proxy["reality-opts"] as Record<string, unknown> | undefined;
  return realityOpts?.["public-key"] ? stripUndefined({ public_key: realityOpts["public-key"], short_id: realityOpts["short-id"] }) : undefined;
}
