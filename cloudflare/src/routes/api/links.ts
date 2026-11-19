import { Hono } from "hono";
import { fetchFlowHeaders, parseFlowHeaders, parseFlowRequest } from "../../lib/flow";
import { failed, success } from "../../lib/http";
import { resourceLinkToken, rotateResourceLink } from "../../lib/link-token";
import { getCollection, getSettings, getSource } from "../../lib/store";
import { stringValue } from "../../lib/values";
import { normalizeDownloadTarget, toApiSource, type ApiContext } from "./dto";
import { getPublicBaseUrl } from "./shared";

export const linkRoutes = new Hono<{ Bindings: SubStoreEnv }>();

linkRoutes.get("/link/source/:name", async (c) => {
  const sub = await getSource(c.env, c.req.param("name"));
  if (!sub) return failed(c, "Source not found", 404);
  const link = await buildDownloadLink(c, "source", sub.id);
  if (!link) return failed(c, "Unsupported target", 400);
  return success(c, link);
});
linkRoutes.get("/link/collection/:name", async (c) => {
  const collection = await getCollection(c.env, c.req.param("name"));
  if (!collection) return failed(c, "Collection not found", 404);
  const link = await buildDownloadLink(c, "collection", collection.id);
  if (!link) return failed(c, "Unsupported target", 400);
  return success(c, link);
});
/* Resetting the link a card hands out only affects that source or collection:
   the new token comes from the bumped version, the old one stops working. */
linkRoutes.post("/link/:kind/:name/rotate", async (c) => {
  const kind = c.req.param("kind");
  if (kind !== "source" && kind !== "collection") return failed(c, "Unsupported resource type", 400);
  const resource = kind === "source"
    ? await getSource(c.env, c.req.param("name"))
    : await getCollection(c.env, c.req.param("name"));
  if (!resource) return failed(c, kind === "source" ? "Source not found" : "Collection not found", 404);
  await rotateResourceLink(c.env, kind, resource.id);
  const link = await buildDownloadLink(c, kind, resource.id);
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

async function buildDownloadLink(c: ApiContext, kind: "source" | "collection", id: string) {
  const rawTarget = c.req.query("target");
  const target = normalizeDownloadTarget(rawTarget);
  if (rawTarget && !target) return undefined;
  const path = ["/download", kind, encodeURIComponent(id), target].filter(Boolean).join("/");
  const url = new URL(path, getPublicBaseUrl(c));
  const token = await resourceLinkToken(c.env, kind, id);
  if (token) url.searchParams.set("token", token);
  for (const key of ["url", "content", "ua", "userAgent"]) {
    const value = c.req.query(key);
    if (value) url.searchParams.set(key, value);
  }
  return { url: url.toString(), target: target || "auto", tokenIncluded: Boolean(token) };
}

function flowFailed(c: ApiContext, message: string, status = 400) {
  return c.json({ status: "failed", error: { code: "NO_FLOW_INFO", type: "NO_FLOW_INFO", message } }, status as 400);
}
