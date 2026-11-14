import type { ProxyNode, RoutingTemplateConfig, SubscriptionTarget } from "../../../types";
import type { BuildOptions } from "../types";
import { base64Utf8 } from "../utils";
import { renderEgernYaml } from "./egern";
import { renderLoonProxies } from "./loon";
import { renderMihomoYaml } from "./mihomo";
import { renderQxProxies } from "./qx";
import { renderSingBoxJson, singBoxSupportsDnsSplit, singBoxUsesFakeIp, singBoxUsesHttpClients } from "./sing-box";
import { convertedRuleSetSource } from "./sing-box-rules";
import { renderSurgeMacProxies, renderSurgeProxies, renderSurfboardProxies } from "./surge";
import { renderProxyUris } from "./uri";

export function renderTarget(proxies: ProxyNode[], target: SubscriptionTarget, template?: RoutingTemplateConfig) {
  if (proxies.length === 0) throw new Error(`No supported nodes for ${target} output`);
  if (target === "mihomo" || target === "stash") return renderMihomoYaml(proxies, new URL("https://sub-store.local/convert"), template);
  if (target === "surge") return renderSurgeProxies(proxies);
  if (target === "surge-mac") return renderSurgeMacProxies(proxies);
  if (target === "surfboard") return renderSurfboardProxies(proxies);
  if (target === "loon") return renderLoonProxies(proxies);
  if (target === "egern") return renderEgernYaml(proxies);
  if (target === "qx") return renderQxProxies(proxies);
  if (target === "sing-box") {
    return renderSingBoxJson(proxies, template, { fakeIp: singBoxUsesFakeIp(template || {}, undefined) });
  }
  if (target === "v2ray") return base64Utf8(renderProxyUris(proxies));
  if (target === "uri" || target === "shadowrocket") return renderProxyUris(proxies);
  return JSON.stringify({ proxies }, null, 2);
}

export function renderBuildTarget(proxies: ProxyNode[], options: BuildOptions) {
  const rulesetCdn = options.settings?.rulesetCdn;
  if (options.target === "mihomo" || options.target === "stash") return renderMihomoYaml(proxies, options.requestUrl, options.template?.config, rulesetCdn);
  if (options.target === "surge") return renderSurgeProxies(proxies);
  if (options.target === "surge-mac") return renderSurgeMacProxies(proxies);
  if (options.target === "surfboard") return renderSurfboardProxies(proxies);
  if (options.target === "loon") return renderLoonProxies(proxies);
  if (options.target === "egern") return renderEgernYaml(proxies);
  if (options.target === "shadowrocket") return renderProxyUris(proxies);
  if (options.target === "qx") return renderQxProxies(proxies);
  if (options.target === "sing-box") {
    return renderSingBoxJson(proxies, options.template?.config, {
      rulesetCdn,
      converted: convertedRuleSetSource(options),
      httpClients: singBoxUsesHttpClients(options),
      fakeIp: singBoxUsesFakeIp(options.template?.config || {}, options.requestUrl?.searchParams.get("singboxFakeIp")),
      // The CN split needs the 1.14 `evaluate` / `respond` DNS actions; older
      // cores keep the route-level resolve action instead.
      dnsSplit: singBoxSupportsDnsSplit(options.requestUserAgent),
    });
  }
  if (options.target === "v2ray") return base64Utf8(renderProxyUris(proxies));
  if (options.target === "uri") return renderProxyUris(proxies);
  if (options.target === "json") return JSON.stringify({ proxies }, null, 2);
  return renderMihomoYaml(proxies, options.requestUrl, options.template?.config, rulesetCdn);
}
