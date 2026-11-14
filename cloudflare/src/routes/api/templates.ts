import { Hono } from "hono";
import { BUILTIN_TEMPLATE_IDS } from "../../lib/defaults";
import { failed, success } from "../../lib/http";
import { getTemplate, listTemplates, upsertTemplate } from "../../lib/store";
import { archiveAndDeleteResource } from "../../lib/compatibility-resources";
import { stringValue, type JsonMap } from "../../lib/values";
import { fromApiTemplate, toApiTemplate } from "./dto";
import { parseJsonOrText } from "./shared";

export const templateRoutes = new Hono<{ Bindings: SubStoreEnv }>();

templateRoutes.get("/templates", async (c) => success(c, (await listTemplates(c.env)).map(toApiTemplate)));
templateRoutes.post("/templates", async (c) => {
  try {
    const input = await parseJsonOrText(c) as JsonMap;
    if (!stringValue(input.name || input.id)) return failed(c, "Template name is required");
    return success(c, toApiTemplate(await upsertTemplate(c.env, fromApiTemplate(input))));
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 400);
  }
});
templateRoutes.get("/templates/:name", async (c) => {
  const template = await getTemplate(c.env, c.req.param("name"));
  if (!template) return failed(c, "Template not found", 404);
  return success(c, toApiTemplate(template));
});
templateRoutes.patch("/templates/:name", async (c) => {
  try {
    const existing = await getTemplate(c.env, c.req.param("name"));
    if (!existing) return failed(c, "Template not found", 404);
    return success(c, toApiTemplate(await upsertTemplate(c.env, { ...fromApiTemplate(await parseJsonOrText(c) as JsonMap), id: existing.id })));
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 400);
  }
});
templateRoutes.delete("/templates/:name", async (c) => {
  try {
    const existing = await getTemplate(c.env, c.req.param("name"));
    if (!existing) return failed(c, "Template not found", 404);
    if (BUILTIN_TEMPLATE_IDS.has(existing.id)) return failed(c, "Built-in templates cannot be deleted", 400);
    await archiveAndDeleteResource(
      c.env,
      "template",
      existing.id,
      existing as unknown as JsonMap,
      c.env.DB.prepare("DELETE FROM templates WHERE id = ?").bind(existing.id),
    );
    return success(c, { deleted: true });
  } catch (error) {
    return failed(c, error instanceof Error ? error.message : String(error), 400);
  }
});
