import type { ProxyNode } from "../../../types";
import { numberOrUndefined, stringSetting, stripUndefined } from "../utils";

export type SingBoxOutbound = Record<string, unknown> & {
  type: string;
  tag: string;
};

export type SingBoxEndpoint = Record<string, unknown> & {
  type: string;
  tag: string;
};

export type SingBoxNode =
  | { kind: "outbound"; outbound: SingBoxOutbound }
  | { kind: "endpoint"; endpoint: SingBoxEndpoint };

export function toSingBoxNode(proxy: ProxyNode): SingBoxNode | undefined {
  const outbound = toSingBoxOutbound(proxy);
  if (outbound) return { kind: "outbound", outbound };
  const endpoint = toSingBoxEndpoint(proxy);
  return endpoint ? { kind: "endpoint", endpoint } : undefined;
}

function toSingBoxOutbound(proxy: ProxyNode): SingBoxOutbound | undefined {
  if (proxy.type === "vless") {
    const realityOpts = proxy["reality-opts"] as Record<string, unknown> | undefined;
    return stripUndefined({
      type: "vless",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      uuid: proxy.uuid,
      flow: proxy.flow,
      network: singBoxNetwork(proxy),
      transport: singBoxTransport(proxy),
      packet_encoding: "xudp",
      tls: proxy.tls
        ? stripUndefined({
            enabled: true,
            server_name: proxy.servername,
            utls: { enabled: true, fingerprint: proxy["client-fingerprint"] || "chrome" },
            reality: realityOpts
              ? stripUndefined({ enabled: true, public_key: realityOpts["public-key"], short_id: realityOpts["short-id"] })
              : undefined,
          })
        : undefined,
    });
  }

  if (proxy.type === "hysteria2") {
    return stripUndefined({
      type: "hysteria2",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      password: proxy.password,
      obfs: proxy.obfs ? { type: proxy.obfs, password: proxy["obfs-password"] } : undefined,
      tls: { enabled: true, server_name: proxy.sni, insecure: Boolean(proxy["skip-cert-verify"]) },
    });
  }

  if (proxy.type === "hysteria") {
    return stripUndefined({
      type: "hysteria",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      auth_str: proxy["auth-str"],
      up_mbps: numberOrUndefined(proxy.up),
      down_mbps: numberOrUndefined(proxy.down),
      obfs: proxy.obfs ? String(proxy.obfs) : undefined,
      tls: { enabled: true, server_name: proxy.sni, insecure: Boolean(proxy["skip-cert-verify"]) },
    });
  }

  if (proxy.type === "anytls") {
    return stripUndefined({
      type: "anytls",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      password: proxy.password,
      tls: {
        enabled: true,
        server_name: proxy.sni || proxy.servername,
        insecure: Boolean(proxy["skip-cert-verify"]),
        utls: { enabled: true, fingerprint: proxy["client-fingerprint"] || "chrome" },
      },
    });
  }

  if (proxy.type === "tuic") {
    return stripUndefined({
      type: "tuic",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      uuid: proxy.uuid,
      password: proxy.password,
      congestion_control: proxy["congestion-controller"],
      udp_relay_mode: proxy["udp-relay-mode"],
      zero_rtt_handshake: proxy["reduce-rtt"],
      tls: { enabled: true, server_name: proxy.sni, insecure: Boolean(proxy["skip-cert-verify"]) },
    });
  }

  if (proxy.type === "trojan") {
    return stripUndefined({
      type: "trojan",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      password: proxy.password,
      tls: { enabled: true, server_name: proxy.sni, insecure: Boolean(proxy["skip-cert-verify"]) },
      transport: singBoxTransport(proxy),
    });
  }

  if (proxy.type === "socks5") {
    return stripUndefined({
      type: "socks",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      version: "5",
      username: proxy.username,
      password: proxy.password,
      tls: proxy.tls ? { enabled: true } : undefined,
    });
  }

  if (proxy.type === "http") {
    return stripUndefined({
      type: "http",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      tls: proxy.tls ? { enabled: true } : undefined,
    });
  }

  if (proxy.type === "ss") {
    return stripUndefined({
      type: "shadowsocks",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      method: proxy.cipher,
      password: proxy.password,
    });
  }

  if (proxy.type === "vmess") {
    return stripUndefined({
      type: "vmess",
      tag: proxy.name,
      server: proxy.server,
      server_port: proxy.port,
      uuid: proxy.uuid,
      security: proxy.cipher || "auto",
      alter_id: proxy.alterId,
      tls: proxy.tls ? { enabled: true, server_name: proxy.servername } : undefined,
      transport: singBoxTransport(proxy),
    });
  }

  return undefined;
}

// sing-box keeps the transport in `transport`, while Clash stores it in
// `network`; `network` only accepts tcp/udp, so writing the Clash value there
// makes the whole profile fail to decode.
function singBoxTransport(proxy: ProxyNode) {
  const network = stringSetting(proxy.network);
  if (network === "ws" || network === "httpupgrade") {
    const wsOpts = proxy["ws-opts"] as { path?: unknown; headers?: unknown } | undefined;
    return stripUndefined({
      type: network,
      path: stringSetting(wsOpts?.path) || "/",
      headers: wsOpts?.headers,
    });
  }
  if (network === "grpc") {
    const grpcOpts = proxy["grpc-opts"] as { "grpc-service-name"?: unknown } | undefined;
    return stripUndefined({ type: "grpc", service_name: stringSetting(grpcOpts?.["grpc-service-name"]) });
  }
  if (network === "h2" || network === "http") {
    const h2Opts = proxy["h2-opts"] as { host?: unknown; path?: unknown } | undefined;
    const host = Array.isArray(h2Opts?.host)
      ? h2Opts.host.map(String)
      : stringSetting(h2Opts?.host)
        ? [stringSetting(h2Opts?.host)]
        : undefined;
    return stripUndefined({ type: "http", host, path: stringSetting(h2Opts?.path) });
  }
  return undefined;
}

function singBoxNetwork(proxy: ProxyNode) {
  const network = stringSetting(proxy.network);
  return network === "tcp" || network === "udp" ? network : undefined;
}

function toSingBoxEndpoint(proxy: ProxyNode): SingBoxEndpoint | undefined {
  if (proxy.type !== "wireguard") return undefined;
  const address = [proxy.ip, proxy.ipv6].map(formatWireGuardAddress).filter(Boolean);
  return stripUndefined({
    type: "wireguard",
    tag: proxy.name,
    address: address.length > 0 ? address : undefined,
    private_key: proxy["private-key"],
    peers: [
      stripUndefined({
        address: proxy.server,
        port: proxy.port,
        public_key: proxy["public-key"],
        pre_shared_key: proxy["pre-shared-key"],
        allowed_ips: ["0.0.0.0/0", "::/0"],
        reserved: parseWireGuardReserved(proxy.reserved),
      }),
    ],
  });
}

function formatWireGuardAddress(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return undefined;
  if (text.includes("/")) return text;
  return `${text}/${text.includes(":") ? "128" : "32"}`;
}

function parseWireGuardReserved(value: unknown) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (typeof value !== "string" || !value.trim()) return undefined;
  const list = value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite);
  return list.length > 0 ? list : undefined;
}
