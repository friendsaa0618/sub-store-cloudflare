/**
 * Each source and collection has its own download token, derived from the
 * deployment download token plus a per-resource version. Nothing secret is
 * stored: D1 only keeps the version, and the link can be recomputed at any
 * time, so a reset just bumps the version and the previous link dies.
 */
const TOKEN_CONTEXT = "sub-store-resource-link-v1";

export async function resourceLinkToken(
  env: SubStoreEnv,
  resourceType: "source" | "collection",
  resourceId: string,
) {
  const secret = env.SUB_STORE_PUBLIC_DOWNLOAD_TOKEN;
  if (!secret) return undefined;
  const version = await resourceLinkVersion(env, resourceType, resourceId);
  return deriveToken(secret, `${TOKEN_CONTEXT}:${resourceType}:${resourceId}:${version}`);
}

export async function rotateResourceLink(
  env: SubStoreEnv,
  resourceType: "source" | "collection",
  resourceId: string,
) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO resource_link_versions (resource_type, resource_id, version, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(resource_type, resource_id) DO UPDATE SET
       version = version + 1,
       updated_at = excluded.updated_at`,
  ).bind(resourceType, resourceId, now).run();
  return resourceLinkToken(env, resourceType, resourceId);
}

export async function isResourceLinkToken(
  env: SubStoreEnv,
  resourceType: "source" | "collection",
  resourceId: string,
  token: string | undefined,
) {
  if (!token) return false;
  const expected = await resourceLinkToken(env, resourceType, resourceId);
  if (!expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(token)),
  ]);
  return crypto.subtle.timingSafeEqual(left, right);
}

async function resourceLinkVersion(
  env: SubStoreEnv,
  resourceType: "source" | "collection",
  resourceId: string,
) {
  const row = await env.DB.prepare(
    "SELECT version FROM resource_link_versions WHERE resource_type = ? AND resource_id = ?",
  ).bind(resourceType, resourceId).first<{ version: number }>();
  return row?.version ?? 0;
}

async function deriveToken(secret: string, context: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(context)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "").slice(0, 32);
}
