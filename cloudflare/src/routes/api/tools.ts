import { Hono } from "hono";
import { failed, success } from "../../lib/http";
import { MAX_FLOW_RESPONSE_BYTES } from "../../lib/limits";
import { readResponseText } from "../../lib/read";
import { convertRules, type RuleTarget } from "../../lib/rules";
import { getSettings, getSubscriptionSources } from "../../lib/store";
import { convertSubscriptionContent, normalizeTargetAlias, previewSourceContent, previewSubscription } from "../../lib/subscription";
import { objectValue, stringValue, type JsonMap } from "../../lib/values";
import { filterList, toSubscriptionCollection, toSubscriptionSource } from "./dto";

export const toolRoutes = new Hono<{ Bindings: SubStoreEnv }>();

toolRoutes.post("/proxy/parse", async (c) => {
  const input: JsonMap = await c.req.json<JsonMap>().catch(() => ({}));
  const target = normalizeTargetAlias(input.client || input.platform || input.target);
  if (!target) return failed(c, "Unsupported target", 400);
  const content = stringValue(input.data ?? input.content);
  if (!content) return failed(c, "Proxy content is required", 400);
  try {
    const result = await convertSubscriptionContent({
      content,
      target,
      filters: filterList(input.filters, input.process),
      settings: await getSettings(c.env),
    });
    return success(c, { par_res: result.content, ...result });
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 400);
  }
});

toolRoutes.post("/rule/parse", async (c) => {
  const input: JsonMap = await c.req.json<JsonMap>().catch(() => ({}));
  const target = normalizeRuleTarget(input.client || input.platform || input.target);
  if (!target) return failed(c, "Unsupported rule target", 400);
  const content = stringValue(input.data ?? input.content);
  if (!content) return failed(c, "Rule content is required", 400);
  const result = convertRules(content, target);
  return success(c, { par_res: result.content, ...result });
});

toolRoutes.post("/utils/node-info", async (c) => {
  const input: JsonMap = await c.req.json<JsonMap>().catch(() => ({}));
  const server = stringValue(input.server).replace(/^\[|\]$/g, "").trim();
  if (!server) return failed(c, "Node server is required", 400);
  const settings = await getSettings(c.env);
  const configured = stringValue(settings.nodeInfoApiUrl) || "https://ipwho.is/{ip}";
  if (!configured.startsWith("https://") || !configured.includes("{ip}")) return failed(c, "Node info API must be an HTTPS URL containing {ip}", 400);
  try {
    const response = await fetch(configured.replace("{ip}", encodeURIComponent(server)), {
      headers: { accept: "application/json", "user-agent": "Sub-Store-Cloudflare/1.0" },
    });
    if (!response.ok) throw new Error(`Node info provider failed: ${response.status}`);
    const body = await readResponseText(response, MAX_FLOW_RESPONSE_BYTES, "Node info response");
    const data = JSON.parse(body) as JsonMap;
    if (data.success === false) throw new Error(stringValue(data.message) || "Node info lookup failed");
    return success(c, {
      ip: stringValue(data.ip),
      country: stringValue(data.country),
      region: stringValue(data.region),
      city: stringValue(data.city),
      connection: objectValue(data.connection),
    });
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 502);
  }
});

toolRoutes.post("/preview/source", async (c) => {
  const input = await c.req.json<JsonMap>();
  try {
    const source = toSubscriptionSource(input);
    if (source.type === "local") {
      return success(c, await previewSourceContent(source, await getSettings(c.env)));
    }
    return success(c, await previewSubscription({ source, sources: [source], settings: await getSettings(c.env) }));
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 400);
  }
});

toolRoutes.post("/preview/collection", async (c) => {
  const input = await c.req.json<JsonMap>();
  try {
    return success(c, await previewSubscription({ collection: toSubscriptionCollection(input), sources: await getSubscriptionSources(c.env), settings: await getSettings(c.env) }));
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 400);
  }
});

function normalizeRuleTarget(input: unknown): RuleTarget | undefined {
  const value = String(input || "").toLowerCase();
  if (["mihomo", "clash", "clashmeta", "clash-meta"].includes(value)) return "mihomo";
  if (value === "surge") return "surge";
  if (value === "loon") return "loon";
  if (["qx", "quanx", "quantumultx", "quantumult-x"].includes(value)) return "qx";
  return undefined;
}
