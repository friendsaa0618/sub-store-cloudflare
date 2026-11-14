import { Hono } from "hono";
import { failed, success } from "../../lib/http";
import { getCollection, listCollections, sortCollections, upsertCollection } from "../../lib/store";
import { archiveAndDeleteResource } from "../../lib/compatibility-resources";
import { stringValue, type JsonMap } from "../../lib/values";
import {
  fromApiCollection,
  mergeCollection,
  toApiCollection,
  validateCollection,
  validateCollectionPayload,
  validateRecordId,
} from "./dto";
import { stringListBody } from "./shared";

export const collectionRoutes = new Hono<{ Bindings: SubStoreEnv }>();

collectionRoutes.get("/collections", async (c) => success(c, (await listCollections(c.env)).map(toApiCollection)));
collectionRoutes.post("/collections", async (c) => {
  const input = await c.req.json<JsonMap>();
  const payloadError = validateCollectionPayload(input);
  if (payloadError) return failed(c, payloadError);
  const idError = validateRecordId(input.id || input.name, "Collection");
  if (idError) return failed(c, idError);
  const collection = fromApiCollection(input);
  if (await getCollection(c.env, collection.id || "")) return failed(c, "Collection id already exists", 409);
  const validationError = await validateCollection(c.env, collection);
  if (validationError) return failed(c, validationError);
  return success(c, toApiCollection(await upsertCollection(c.env, collection)));
});
collectionRoutes.put("/collections", async (c) => {
  const input = await c.req.json().catch(() => []);
  if (!Array.isArray(input)) return failed(c, "Collection sort payload must be an array");
  return success(c, (await sortCollections(c.env, input.map((item) => stringValue(item.id || item.name || item)).filter(Boolean))).map(toApiCollection));
});
collectionRoutes.post("/sort/collections", async (c) => success(c, (await sortCollections(c.env, await stringListBody(c))).map(toApiCollection)));

collectionRoutes.get("/collections/:name", async (c) => {
  const collection = await getCollection(c.env, c.req.param("name"));
  if (!collection) return failed(c, "Collection not found", 404);
  return success(c, toApiCollection(collection));
});
collectionRoutes.patch("/collections/:name", async (c) => {
  const existing = await getCollection(c.env, c.req.param("name"));
  if (!existing) return failed(c, "Collection not found", 404);
  const input = await c.req.json<JsonMap>();
  const payloadError = validateCollectionPayload(input, true);
  if (payloadError) return failed(c, payloadError);
  const collection = mergeCollection(existing, fromApiCollection(input, true));
  const validationError = await validateCollection(c.env, collection);
  if (validationError) return failed(c, validationError);
  return success(c, toApiCollection(await upsertCollection(c.env, collection)));
});
collectionRoutes.delete("/collections/:name", async (c) => {
  const existing = await getCollection(c.env, c.req.param("name"));
  if (!existing) return failed(c, "Collection not found", 404);
  await archiveAndDeleteResource(
    c.env,
    "collection",
    existing.id,
    existing as unknown as JsonMap,
    c.env.DB.prepare("DELETE FROM collections WHERE id = ?").bind(existing.id),
  );
  return success(c, { deleted: true });
});
