import { Hono } from "hono";
import {
  archiveAndDeleteResource,
  createDownloadGrant,
  deleteRecycleBinEntry,
  getDownloadGrant,
  getDownloadGrantSnapshot,
  getRecycleBinEntry,
  listDownloadGrants,
  listRecycleBin,
  restoreDownloadGrantSnapshot,
  rotateDownloadGrant,
  updateDownloadGrant,
} from "../../lib/compatibility-resources";
import { failed, success } from "../../lib/http";
import {
  getCollection,
  getSource,
  getTemplate,
  upsertCollection,
  upsertSource,
  upsertTemplate,
} from "../../lib/store";
import { normalizeTargetAlias } from "../../lib/subscription";
import { numberValue, stringValue, type JsonMap } from "../../lib/values";
import type { CollectionRecord, DownloadGrantRecord, SourceRecord, TemplateRecord } from "../../types";
import { toRecycleSummary, validateCollection, type ApiContext } from "./dto";
import { getPublicBaseUrl } from "./shared";

export const shareRoutes = new Hono<{ Bindings: SubStoreEnv }>();

shareRoutes.get("/shares", async (c) => success(c, await listDownloadGrants(c.env)));
shareRoutes.post("/shares", async (c) => {
  const input: JsonMap = await c.req.json<JsonMap>().catch(() => ({}));
  const resourceType = input.resourceType === "collection" ? "collection" : input.resourceType === "source" ? "source" : undefined;
  const resourceId = stringValue(input.resourceId);
  if (!resourceType || !resourceId) return failed(c, "Share resourceType and resourceId are required", 400);
  const resourceExists = resourceType === "source"
    ? Boolean(await getSource(c.env, resourceId))
    : Boolean(await getCollection(c.env, resourceId));
  if (!resourceExists) return failed(c, "Share resource does not exist", 404);
  const target = input.target ? normalizeTargetAlias(input.target) : undefined;
  if (input.target && !target) return failed(c, "Unsupported target", 400);
  const expiresIn = numberValue(input.expiresIn, 0, 0, 365 * 24 * 60 * 60);
  const expiresAt = input.expiresAt
    ? numberValue(input.expiresAt, 0, Date.now() + 60_000, Date.now() + 365 * 24 * 60 * 60 * 1000)
    : expiresIn > 0 ? Date.now() + expiresIn * 1000 : undefined;
  const created = await createDownloadGrant(c.env, { resourceType, resourceId, target, expiresAt });
  return success(c, { ...created.grant, token: created.token, url: shareUrl(c, created.grant, created.token) });
});
/* A leaked scoped link is replaced in place: the old token stops working at
   once, and the grant keeps its resource, target, and expiry. */
shareRoutes.post("/shares/:id/rotate", async (c) => {
  const rotated = await rotateDownloadGrant(c.env, c.req.param("id"));
  if (!rotated) return failed(c, "Share not found", 404);
  return success(c, { ...rotated.grant, token: rotated.token, url: shareUrl(c, rotated.grant, rotated.token) });
});
shareRoutes.patch("/shares/:id", async (c) => {
  const input: JsonMap = await c.req.json<JsonMap>().catch(() => ({}));
  const updated = await updateDownloadGrant(c.env, c.req.param("id"), {
    enabled: typeof input.enabled === "boolean" ? input.enabled : undefined,
    expiresAt: input.expiresAt === null ? null : input.expiresAt ? Number(input.expiresAt) : undefined,
  });
  return updated ? success(c, updated) : failed(c, "Share not found", 404);
});
shareRoutes.delete("/shares/:id", async (c) => {
  const snapshot = await getDownloadGrantSnapshot(c.env, c.req.param("id"));
  if (!snapshot) return failed(c, "Share not found", 404);
  await archiveAndDeleteResource(
    c.env,
    "share",
    snapshot.id,
    snapshot as unknown as JsonMap,
    c.env.DB.prepare("DELETE FROM download_grants WHERE id = ?").bind(snapshot.id),
  );
  return success(c, { deleted: true });
});

shareRoutes.get("/recycle-bin", async (c) => {
  const entries = await listRecycleBin(c.env);
  return success(c, entries.map(toRecycleSummary));
});
shareRoutes.delete("/recycle-bin/:id", async (c) => {
  const existing = await getRecycleBinEntry(c.env, c.req.param("id"));
  if (!existing) return failed(c, "Recycle entry not found", 404);
  await deleteRecycleBinEntry(c.env, existing.id);
  return success(c, { deleted: true });
});
shareRoutes.post("/recycle-bin/:id/restore", async (c) => {
  const entry = await getRecycleBinEntry(c.env, c.req.param("id"));
  if (!entry) return failed(c, "Recycle entry not found", 404);
  try {
    if (entry.resourceType === "source") {
      if (await getSource(c.env, entry.resourceId)) return failed(c, "Source id already exists", 409);
      await upsertSource(c.env, entry.snapshot as Partial<SourceRecord>);
    } else if (entry.resourceType === "collection") {
      if (await getCollection(c.env, entry.resourceId)) return failed(c, "Collection id already exists", 409);
      const validationError = await validateCollection(c.env, entry.snapshot as Partial<CollectionRecord>);
      if (validationError) return failed(c, validationError, 409);
      await upsertCollection(c.env, entry.snapshot as Partial<CollectionRecord>);
    } else if (entry.resourceType === "template") {
      if (await getTemplate(c.env, entry.resourceId)) return failed(c, "Template id already exists", 409);
      await upsertTemplate(c.env, entry.snapshot as Partial<TemplateRecord>);
    } else {
      if (await getDownloadGrant(c.env, entry.resourceId)) return failed(c, "Share id already exists", 409);
      await restoreDownloadGrantSnapshot(c.env, entry.snapshot);
    }
    await deleteRecycleBinEntry(c.env, entry.id);
    return success(c, { restored: true, resourceType: entry.resourceType, resourceId: entry.resourceId });
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 409);
  }
});

function shareUrl(c: ApiContext, grant: Pick<DownloadGrantRecord, "resourceType" | "resourceId" | "target">, token: string) {
  const path = ["/download", grant.resourceType, encodeURIComponent(grant.resourceId), grant.target].filter(Boolean).join("/");
  const url = new URL(path, getPublicBaseUrl(c));
  url.searchParams.set("token", token);
  return url.toString();
}
