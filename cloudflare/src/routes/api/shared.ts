import type { Context } from "hono";
import type { JsonMap } from "../../lib/values";

type ApiContext = Context<{ Bindings: SubStoreEnv }>;

export function getPublicBaseUrl(c: ApiContext) {
  const publicHost = (c.env.SUB_STORE_PUBLIC_DOWNLOAD_HOSTS || "").split(",").map((host) => host.trim()).find(Boolean);
  return publicHost ? `https://${publicHost}` : new URL(c.req.url).origin;
}

export async function stringListBody(c: ApiContext) {
  const input = await c.req.json().catch(() => []);
  return Array.isArray(input) ? input.map(String).filter(Boolean) : [];
}

export async function parseJsonOrText(c: ApiContext) {
  const contentType = c.req.header("content-type") || "";
  if (contentType.includes("application/json")) {
    return c.req.json().catch(() => ({}));
  }
  const text = await c.req.text();
  if (!text.trim()) return {} as JsonMap;
  try {
    return JSON.parse(text) as JsonMap;
  } catch {
    return { content: text };
  }
}
