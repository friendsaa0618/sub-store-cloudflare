import { Hono } from "hono";
import { fetchFlowHeaders, parseFlowHeaders, parseFlowRequest } from "../../lib/flow";
import { failed, success } from "../../lib/http";
import { getCollection, getSettings, getSource } from "../../lib/store";
import { stringValue } from "../../lib/values";
import { normalizeDownloadTarget, toApiSource, type ApiContext } from "./dto";
import { getPublicBaseUrl } from "./shared";

export const linkRoutes = new Hono<{ Bindings: SubStoreEnv }>();

linkRoutes.get("/link/source/:name", async (c) => {
  const sub = await getSource(c.env, c.req.param("name"));
  if (!sub) return failed(c, "Source not found", 404);
  const link = buildDownloadLink(c, "source", sub.id);
  if (!link) return failed(c, "Unsupported target", 400);
  return success(c, link);
});
linkRoutes.get("/link/collection/:name", async (c) => {
  const collection = await getCollection(c.env, c.req.param("name"));
  if (!collection) return failed(c, "Collection not found", 404);
  const link = buildDownloadLink(c, "collection", collection.id);
  if (!link) return failed(c, "Unsupported target", 400);
  return success(c, link);
});

linkRoutes.get("/source/flow/:name", async (c) => {
  const sub = await getSource(c.env, c.req.param("name"));
  if (!sub) return flowFailed(c, "Source not found", 404);
  const parsed = parseFlowRequest(toApiSource(sub), await getSettings(c.env));
  if (!parsed) return flowFailed(c, "No flow info");

  try {
    const headers = await fetchFlowHeaders(parsed);
    const flow = parseFlowHeaders([stringValue(sub.meta.subUserinfo), headers].filter(Boolean).join("; "));
    if (!flow) return flowFailed(c, "No flow info");
    return success(c, flow);
  } catch (error) {
    return flowFailed(c, error instanceof Error ? error.message : String(error), 500);
  }
});

function buildDownloadLink(c: ApiContext, kind: "source" | "collection", id: string) {
  const rawTarget = c.req.query("target");
  const target = normalizeDownloadTarget(rawTarget);
  if (rawTarget && !target) return undefined;
  const path = ["/download", kind, encodeURIComponent(id), target].filter(Boolean).join("/");
  const url = new URL(path, getPublicBaseUrl(c));
  if (c.env.SUB_STORE_PUBLIC_DOWNLOAD_TOKEN) url.searchParams.set("token", c.env.SUB_STORE_PUBLIC_DOWNLOAD_TOKEN);
  for (const key of ["url", "content", "ua", "userAgent"]) {
    const value = c.req.query(key);
    if (value) url.searchParams.set(key, value);
  }
  return { url: url.toString(), target: target || "auto", tokenIncluded: Boolean(c.env.SUB_STORE_PUBLIC_DOWNLOAD_TOKEN) };
}

function flowFailed(c: ApiContext, message: string, status = 400) {
  return c.json({ status: "failed", error: { code: "NO_FLOW_INFO", type: "NO_FLOW_INFO", message } }, status as 400);
}
