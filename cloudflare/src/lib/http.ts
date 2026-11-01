import type { Context } from "hono";
export function success(c: Context<{ Bindings: SubStoreEnv }>, data: unknown) {
  return c.json({ status: "success", data });
}

export function failed(c: Context<{ Bindings: SubStoreEnv }>, message: string, status = 400) {
  return c.json(
    {
      status: "failed",
      error: {
        code: status,
        message,
      },
    },
    status as 400,
  );
}

export async function isTokenValid(secret: string | undefined, input: string | undefined) {
  if (!secret) return false;
  if (!input) return false;

  const encoder = new TextEncoder();
  const [inputDigest, secretDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(secret)),
  ]);
  return crypto.subtle.timingSafeEqual(inputDigest, secretDigest);
}

export function getBearerToken(c: Context<{ Bindings: SubStoreEnv }>) {
  const authorization = c.req.header("authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || c.req.query("token") || c.req.header("x-sub-store-token");
}

/**
 * The admin token is the default credential. When the deployment sits behind
 * Cloudflare Access (`SUB_STORE_ACCESS_TEAM_DOMAIN` + `SUB_STORE_ACCESS_AUD`),
 * a request that Access already authenticated is accepted without it: Access
 * has verified the user's identity against the application policy, and the
 * signed JWT proves the request came through that application.
 */
export async function requireAdmin(c: Context<{ Bindings: SubStoreEnv }>) {
  if (await isTokenValid(c.env.SUB_STORE_ADMIN_TOKEN, getBearerToken(c))) return undefined;
  if (await isAccessAuthenticated(c)) return undefined;
  return failed(c, "Admin token is invalid", 401);
}

type AccessJwtHeader = { alg?: string; kid?: string };
type AccessJwtPayload = { iss?: string; aud?: string | string[]; exp?: number; nbf?: number };
type AccessSigningKey = JsonWebKey & { kid?: string };

const ACCESS_CERTS_CACHE_SECONDS = 3600;

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeSegment<T>(segment: string): T | undefined {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
  } catch {
    return undefined;
  }
}

async function loadAccessKeys(teamDomain: string): Promise<AccessSigningKey[]> {
  const cacheKey = new Request(`https://sub-store.internal/access-certs/${teamDomain}`);
  const cached = await caches.default.match(cacheKey).catch(() => undefined);
  if (cached) {
    const body = await cached.json<{ keys?: AccessSigningKey[] }>().catch(() => undefined);
    if (body?.keys?.length) return body.keys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Access certs request failed: ${response.status}`);
  const text = await response.text();
  const parsed = JSON.parse(text) as { keys?: AccessSigningKey[] };
  if (!parsed.keys?.length) throw new Error("Access certs response has no keys");

  await caches.default.put(cacheKey, new Response(text, {
    headers: {
      "content-type": "application/json",
      "cache-control": `public, s-maxage=${ACCESS_CERTS_CACHE_SECONDS}`,
    },
  })).catch(() => undefined);
  return parsed.keys;
}

async function verifyAccessJwt(token: string, teamDomain: string, audience: string) {
  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  if (!headerSegment || !payloadSegment || !signatureSegment) return false;

  const header = decodeSegment<AccessJwtHeader>(headerSegment);
  const payload = decodeSegment<AccessJwtPayload>(payloadSegment);
  if (!header || !payload) return false;
  if (header.alg !== "RS256" || !header.kid) return false;

  const keys = await loadAccessKeys(teamDomain);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) return false;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(signatureSegment),
    new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
  );
  if (!valid) return false;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return false;
  if (typeof payload.nbf === "number" && payload.nbf > now + 60) return false;
  if (payload.iss !== `https://${teamDomain}`) return false;

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  return audiences.includes(audience);
}

async function isAccessAuthenticated(c: Context<{ Bindings: SubStoreEnv }>) {
  const teamDomain = (c.env.SUB_STORE_ACCESS_TEAM_DOMAIN || "").trim();
  const audience = (c.env.SUB_STORE_ACCESS_AUD || "").trim();
  const token = c.req.header("cf-access-jwt-assertion");
  if (!teamDomain || !audience || !token) return false;

  try {
    return await verifyAccessJwt(token, teamDomain, audience);
  } catch {
    return false;
  }
}

export function applyCorsHeaders(response: Response, origin: string | undefined, allowedOrigins = "") {
  const headers = new Headers(response.headers);
  const allowlist = allowedOrigins
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (origin && (allowlist.includes("*") || allowlist.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Sub-Store-Token");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function applySecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Security-Policy",
    // img-src allows DiceBear public avatars (auto icons for subs/collections)
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.dicebear.com; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'",
  );
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
