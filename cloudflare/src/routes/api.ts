import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { failed, requireAdmin } from "../lib/http";
import { MAX_API_BODY_BYTES } from "../lib/limits";
import { collectionRoutes } from "./api/collections";
import { linkRoutes } from "./api/links";
import { metaRoutes } from "./api/meta";
import { shareRoutes } from "./api/shares";
import { sourceRoutes } from "./api/sources";
import { templateRoutes } from "./api/templates";
import { toolRoutes } from "./api/tools";

export const apiRoutes = new Hono<{ Bindings: SubStoreEnv }>();

// Runs first so even an auth failure comes back uncacheable.
apiRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});
apiRoutes.use("*", async (c, next) => {
  const invalid = await requireAdmin(c);
  if (invalid) return invalid;
  return next();
});
apiRoutes.use(
  "*",
  bodyLimit({
    maxSize: MAX_API_BODY_BYTES,
    onError: (c) => failed(c, "Request body is too large", 413),
  }),
);

apiRoutes.route("/", metaRoutes);
apiRoutes.route("/", toolRoutes);
apiRoutes.route("/", sourceRoutes);
apiRoutes.route("/", collectionRoutes);
apiRoutes.route("/", templateRoutes);
apiRoutes.route("/", shareRoutes);
apiRoutes.route("/", linkRoutes);
