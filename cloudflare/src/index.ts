import { Hono } from "hono";
import { apiRoutes } from "./routes/api";
import { downloadRoutes } from "./routes/download";
import { applyCorsHeaders, applySecurityHeaders } from "./lib/http";

const app = new Hono<{ Bindings: SubStoreEnv }>();

app.onError((error, c) => {
  console.error(JSON.stringify({
    level: "error",
    method: c.req.method,
    route: c.req.path,
    requestId: c.req.header("cf-ray") || undefined,
    message: error.message,
    stack: error.stack,
  }));
  return c.json(
    {
      status: "failed",
      error: {
        code: 500,
        message: "Internal server error",
      },
    },
    500,
  );
});

app.options("*", (c) => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Sub-Store-Token",
    },
  });
});

app.route("/api", apiRoutes);
app.route("/", downloadRoutes);
// Keep these upgrade cleanup endpoints so older browser registrations
// unregister themselves after moving to the current frontend.
app.get("/sw.js", (c) =>
  c.text("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',(event)=>event.waitUntil(self.registration.unregister()));", 200, {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "no-store",
  }),
);
app.get("/registerSW.js", (c) => c.text("", 200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" }));
// Scanner traffic (/.env, /graphql, /xmlrpc.php, /dump.sql, ...) used to get the
// SPA shell. Only navigations and real app routes get it now; everything else
// gets a plain 404 so those probes stay cheap and honest.
const SPA_ROUTE_PREFIXES = ["/subs", "/my", "/tools", "/preview", "/edit", "/404"];

function isSpaRoute(pathname: string) {
  if (pathname === "/" || pathname === "/index.html") return true;
  return SPA_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

app.notFound(async (c) => {
  const pathname = new URL(c.req.url).pathname;
  const asset = c.env.ASSETS ? await c.env.ASSETS.fetch(c.req.raw) : undefined;
  if (asset && !asset.ok) return asset;
  const isHtmlShell = (asset?.headers.get("content-type") || "").includes("text/html");
  const isNavigation = (c.req.header("sec-fetch-mode") || "").toLowerCase() === "navigate";
  if (!asset || !isHtmlShell || isNavigation || isSpaRoute(pathname)) {
    return asset || c.text("Not Found", 404);
  }
  return c.text("Not Found", 404, { "cache-control": "no-store" });
});

export default {
  async fetch(request: Request, env: SubStoreEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const publicDownloadHosts = (env.SUB_STORE_PUBLIC_DOWNLOAD_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);

    if (publicDownloadHosts.includes(hostname) && !url.pathname.startsWith("/download/")) {
      return applySecurityHeaders(new Response("Not Found", {
        status: 404,
        headers: {
          "cache-control": "no-store",
        },
      }));
    }

    const response = await app.fetch(request, env, ctx);
    return applySecurityHeaders(applyCorsHeaders(response, request.headers.get("origin") || undefined));
  },
} satisfies ExportedHandler<SubStoreEnv>;
