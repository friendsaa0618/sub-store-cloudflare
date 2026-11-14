import { Hono } from "hono";
import { failed, success } from "../../lib/http";
import { getSource, listCollections, listSources, sortSources, upsertSource, withoutOtherModeField } from "../../lib/store";
import { archiveAndDeleteResource } from "../../lib/compatibility-resources";
import { stringValue, type JsonMap } from "../../lib/values";
import {
  fromApiSource,
  mergeSource,
  toApiSource,
  validateRecordId,
  validateSource,
  validateSourcePayload,
} from "./dto";
import { stringListBody } from "./shared";

export const sourceRoutes = new Hono<{ Bindings: SubStoreEnv }>();

sourceRoutes.get("/sources", async (c) => success(c, (await listSources(c.env)).map(toApiSource)));
sourceRoutes.post("/sources", async (c) => {
  const input = await c.req.json<JsonMap>();
  const payloadError = validateSourcePayload(input);
  if (payloadError) return failed(c, payloadError);
  const idError = validateRecordId(input.id || input.name, "Source");
  if (idError) return failed(c, idError);
  const source = withoutOtherModeField(fromApiSource(input));
  if (await getSource(c.env, source.id || "")) return failed(c, "Source id already exists", 409);
  const validationError = validateSource(source);
  if (validationError) return failed(c, validationError);
  return success(c, toApiSource(await upsertSource(c.env, source)));
});
sourceRoutes.put("/sources", async (c) => {
  const input = await c.req.json().catch(() => []);
  if (!Array.isArray(input)) return failed(c, "Source sort payload must be an array");
  return success(c, (await sortSources(c.env, input.map((item) => stringValue(item.id || item.name || item)).filter(Boolean))).map(toApiSource));
});
sourceRoutes.post("/sort/sources", async (c) => success(c, (await sortSources(c.env, await stringListBody(c))).map(toApiSource)));

sourceRoutes.get("/sources/:name", async (c) => {
  const sub = await getSource(c.env, c.req.param("name"));
  if (!sub) return failed(c, "Source not found", 404);
  return success(c, toApiSource(sub));
});
sourceRoutes.patch("/sources/:name", async (c) => {
  const existing = await getSource(c.env, c.req.param("name"));
  if (!existing) return failed(c, "Source not found", 404);
  const input = await c.req.json<JsonMap>();
  const payloadError = validateSourcePayload(input, true);
  if (payloadError) return failed(c, payloadError);
  const source = withoutOtherModeField(mergeSource(existing, fromApiSource(input, true)));
  const validationError = validateSource(source);
  if (validationError) return failed(c, validationError);
  return success(c, toApiSource(await upsertSource(c.env, source)));
});
sourceRoutes.delete("/sources/:name", async (c) => {
  const existing = await getSource(c.env, c.req.param("name"));
  if (!existing) return failed(c, "Source not found", 404);
  const references = (await listCollections(c.env)).filter((collection) => collection.sourceIds.includes(existing.id)).map((collection) => collection.id);
  if (references.length > 0) return failed(c, `Source is used by collections: ${references.join(", ")}`, 409);
  await archiveAndDeleteResource(
    c.env,
    "source",
    existing.id,
    existing as unknown as JsonMap,
    c.env.DB.prepare("DELETE FROM sources WHERE id = ?").bind(existing.id),
  );
  return success(c, { deleted: true, references: [] });
});
