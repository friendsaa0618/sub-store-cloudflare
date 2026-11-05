import { env, exports as workerExports } from "cloudflare:workers";
import { beforeAll, describe, expect, it, vi } from "vitest";

const ADMIN_TOKEN = "test-admin-token";
const DOWNLOAD_TOKEN = "test-download-token";

describe("Worker and D1 integration", () => {
  it("applies migrations and keeps built-in templates out of D1", async () => {
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all<{ name: string }>();
    expect(tables.results.map((row) => row.name)).toEqual(expect.arrayContaining([
      "app_settings",
      "collections",
      "d1_migrations",
      "download_grants",
      "recycle_bin",
      "sources",
      "templates",
    ]));

    const columns = await env.DB.prepare("PRAGMA table_info(sources)").all<{ name: string }>();
    expect(columns.results.map((row) => row.name)).toContain("meta_json");
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM templates").first("count")).toBe(0);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM collections WHERE id = 'daily'").first("count")).toBe(1);
  });

  it("requires admin auth and returns hardened responses", async () => {
    const unauthorized = await workerRequest("/api/env", {}, false);
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(unauthorized.headers.get("referrer-policy")).toBe("no-referrer");
    expect(unauthorized.headers.get("x-content-type-options")).toBe("nosniff");
    expect(unauthorized.headers.get("x-frame-options")).toBe("DENY");

    const authorized = await workerRequest("/api/env");
    expect(authorized.status).toBe(200);
    expect(getPath(await jsonObject(authorized), "status")).toBe("success");
  });

  it("keeps a download-only host to downloads", async () => {
    const create = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "host-source",
        name: "Host Source",
        type: "local",
        content: "trojan://password@example.com:443#Host%20Node",
      }),
    });
    expect(create.status).toBe(200);

    const downloadHost = (path: string) =>
      workerExports.default.fetch(new Request(`https://downloads.example.com${path}`));

    // The admin surface does not exist on this host, even with a valid token.
    const api = await workerExports.default.fetch(new Request("https://downloads.example.com/api/env", {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    }));
    expect(api.status).toBe(404);
    expect((await downloadHost("/")).status).toBe(404);

    // Downloads still work with the download token.
    const download = await downloadHost(`/download/source/host-source/json/${DOWNLOAD_TOKEN}`);
    expect(download.status).toBe(200);

    // ...but the ad-hoc source override is refused: it would let the token
    // holder use the Worker as a generic fetch proxy.
    const override = await downloadHost(`/download/source/host-source/json/${DOWNLOAD_TOKEN}?url=https%3A%2F%2Fexample.com%2Fsub`);
    expect(override.status).toBe(400);
    expect(getPath(await jsonObject(override), "error", "message")).toContain("not available on this host");
  });

  it("keeps the admin token out of URLs and never caches admin responses", async () => {
    const queryToken = await workerRequest(`/api/env?token=${ADMIN_TOKEN}`, {}, false);
    expect(queryToken.status).toBe(401);
    expect(queryToken.headers.get("cache-control")).toBe("no-store");
    expect(queryToken.headers.get("x-robots-tag")).toBe("noindex, nofollow");

    const headerToken = await workerRequest("/api/env");
    expect(headerToken.status).toBe(200);
    expect(headerToken.headers.get("cache-control")).toBe("no-store");
  });

  describe("Cloudflare Access", () => {
    const TEAM_DOMAIN = "team.cloudflareaccess.com";
    const AUDIENCE = "test-access-aud";
    let signingKey: CryptoKey;
    let publicJwk: JsonWebKey & { kid: string };

    const toBase64Url = (input: Uint8Array | string) => {
      const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };

    const signAccessJwt = async (payload: Record<string, unknown>, key: CryptoKey) => {
      const header = toBase64Url(JSON.stringify({ alg: "RS256", kid: "test-access-kid", typ: "JWT" }));
      const body = toBase64Url(JSON.stringify(payload));
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(`${header}.${body}`),
      );
      return `${header}.${body}.${toBase64Url(new Uint8Array(signature))}`;
    };

    const validPayload = () => ({
      iss: `https://${TEAM_DOMAIN}`,
      aud: [AUDIENCE],
      exp: Math.floor(Date.now() / 1000) + 300,
      email: "proxy@duanfei.org",
    });

    beforeAll(async () => {
      const pair = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true,
        ["sign", "verify"],
      ) as CryptoKeyPair;
      signingKey = pair.privateKey;
      const exported = await crypto.subtle.exportKey("jwk", pair.publicKey) as JsonWebKey;
      publicJwk = { ...exported, kid: "test-access-kid", alg: "RS256", use: "sig" } as JsonWebKey & { kid: string };
    });

    const withAccessCerts = (run: () => Promise<void>) => async () => {
      const originalFetch = globalThis.fetch;
      const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        if (url === `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { "content-type": "application/json" } });
        }
        return originalFetch(input as RequestInfo, init);
      });
      try {
        await run();
      } finally {
        spy.mockRestore();
      }
    };

    it("accepts a request already authenticated by Access", withAccessCerts(async () => {
      const token = await signAccessJwt(validPayload(), signingKey);
      const response = await workerRequest("/api/env", { headers: { "cf-access-jwt-assertion": token } }, false);
      expect(response.status).toBe(200);
      expect(getPath(await jsonObject(response), "status")).toBe("success");
    }));

    it("rejects a JWT that was not signed by Access", withAccessCerts(async () => {
      const other = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true,
        ["sign", "verify"],
      ) as CryptoKeyPair;
      const token = await signAccessJwt(validPayload(), other.privateKey);
      const response = await workerRequest("/api/env", { headers: { "cf-access-jwt-assertion": token } }, false);
      expect(response.status).toBe(401);
    }));

    it("rejects a JWT issued for another Access application", withAccessCerts(async () => {
      const token = await signAccessJwt({ ...validPayload(), aud: ["some-other-app"] }, signingKey);
      const response = await workerRequest("/api/env", { headers: { "cf-access-jwt-assertion": token } }, false);
      expect(response.status).toBe(401);
    }));

    it("still requires a credential when no Access JWT is present", withAccessCerts(async () => {
      const response = await workerRequest("/api/env", {}, false);
      expect(response.status).toBe(401);
    }));
  });

  it("serves the boot payload in one request and matches the individual endpoints", async () => {
    const unauthorized = await workerRequest("/api/bootstrap", {}, false);
    expect(unauthorized.status).toBe(401);

    const createSource = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "boot-source",
        name: "Boot Source",
        type: "local",
        content: "trojan://password@example.com:443#Boot%20Node",
      }),
    });
    expect(createSource.status).toBe(200);

    const bootstrap = await workerRequest("/api/bootstrap");
    expect(bootstrap.status).toBe(200);
    const body = await jsonObject(bootstrap);
    expect(getPath(body, "status")).toBe("success");
    expect(getPath(body, "data", "env", "backend")).toBe("Cloudflare");
    // Settings come back merged with the defaults, not as a raw D1 row.
    expect(getPath(body, "data", "settings", "defaultUserAgent")).toBeTruthy();
    expect(getPath(body, "data", "settings", "theme")).toBeTruthy();

    const sources = getPath(body, "data", "sources") as Array<Record<string, unknown>>;
    const collections = getPath(body, "data", "collections") as Array<Record<string, unknown>>;
    const bootSource = sources.find((item) => item.id === "boot-source");
    expect(bootSource).toMatchObject({ id: "boot-source", name: "Boot Source", type: "local" });
    expect(collections.map((item) => item.id)).toContain("daily");

    // The payload has to stay byte-for-byte equivalent to the separate reads,
    // otherwise the UI would render differently depending on how it booted.
    const sourcesResponse = await workerRequest("/api/sources");
    const sourcesPayload = await jsonObject(sourcesResponse);
    expect(getPath(sourcesPayload, "data")).toEqual(sources);

    const collectionsResponse = await workerRequest("/api/collections");
    const collectionsPayload = await jsonObject(collectionsResponse);
    expect(getPath(collectionsPayload, "data")).toEqual(collections);

    const settingsResponse = await workerRequest("/api/settings");
    const settingsPayload = await jsonObject(settingsResponse);
    expect(getPath(settingsPayload, "data")).toEqual(getPath(body, "data", "settings"));
  });

  it("publishes build-time script metadata and executes saved script actions", async () => {
    const scriptsResponse = await workerRequest("/api/scripts");
    expect(scriptsResponse.status).toBe(200);
    const scripts = getPath(await jsonObject(scriptsResponse), "data");
    expect(Array.isArray(scripts) ? scripts.map((script) => getPath(script, "id")) : []).toEqual(
      expect.arrayContaining(["tls-fingerprint", "name-regex-filter"]),
    );

    const create = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "scripted-source",
        name: "Scripted Source",
        type: "local",
        content: "trojan://password@example.com:443#Scripted%20Node",
        filters: [{
          type: "script",
          scriptId: "tls-fingerprint",
          scriptKind: "operator",
          arguments: { fingerprint: "safari" },
        }],
      }),
    });
    expect(create.status).toBe(200);

    const download = await workerRequest(`/download/source/scripted-source/json/${DOWNLOAD_TOKEN}`, {}, false);
    expect(download.status).toBe(200);
    expect(await download.text()).toContain('"tls-fingerprint": "safari"');

    const invalid = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "missing-script-source",
        name: "Missing Script",
        type: "local",
        content: "trojan://password@example.com:443#Node",
        filters: [{ type: "script", scriptId: "missing-script" }],
      }),
    });
    expect(invalid.status).toBe(400);
    expect(getPath(await jsonObject(invalid), "error", "message")).toContain("Unknown script");
  });

  it("hardens the download-only host boundary", async () => {
    const response = await workerExports.default.fetch(new Request("https://downloads.example.com/"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");

    const spoofedHost = await workerRequest("/api/env", {
      headers: { "x-forwarded-host": "downloads.example.com" },
    });
    expect(spoofedHost.status).toBe(200);
  });

  it("keeps record ids immutable and preserves omitted fields in partial updates", async () => {
    const sourceCreate = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "patch-source",
        name: "Patch Source",
        type: "local",
        content: "trojan://password@example.com:443#Patch%20Node",
        enabled: true,
        meta: { remark: "keep-me" },
      }),
    });
    expect(sourceCreate.status).toBe(200);

    const sourcePatch = await workerRequest("/api/sources/patch-source", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "renamed-source", name: "Updated Source" }),
    });
    const patchedSource = getPath(await jsonObject(sourcePatch), "data") as Record<string, unknown>;
    expect(sourcePatch.status).toBe(200);
    expect(patchedSource.id).toBe("patch-source");
    expect(patchedSource.name).toBe("Updated Source");
    expect(patchedSource.content).toContain("Patch%20Node");
    expect(getPath(patchedSource, "meta", "remark")).toBe("keep-me");
    expect((await workerRequest("/api/sources/renamed-source")).status).toBe(404);

    const linkResponse = await workerRequest("/api/link/source/patch-source?target=json", {
      headers: { "x-forwarded-host": "attacker.example" },
    });
    expect(getPath(await jsonObject(linkResponse), "data", "url")).toBe(
      `https://downloads.example.com/download/source/patch-source/json?token=${DOWNLOAD_TOKEN}`,
    );

    const collectionCreate = await workerRequest("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "patch-collection",
        name: "Patch Collection",
        sourceIds: ["patch-source"],
        templateId: "mihomo-basic",
        ignoreFailed: false,
        enabled: true,
      }),
    });
    expect(collectionCreate.status).toBe(200);

    const collectionPatch = await workerRequest("/api/collections/patch-collection", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "renamed-collection", name: "Updated Collection" }),
    });
    const patchedCollection = getPath(await jsonObject(collectionPatch), "data") as Record<string, unknown>;
    expect(collectionPatch.status).toBe(200);
    expect(patchedCollection.id).toBe("patch-collection");
    expect(patchedCollection.sourceIds).toEqual(["patch-source"]);
    expect(patchedCollection.templateId).toBe("mihomo-basic");
    expect(patchedCollection.ignoreFailed).toBe(false);

    const blockedDelete = await workerRequest("/api/sources/patch-source", { method: "DELETE" });
    expect(blockedDelete.status).toBe(409);
    expect(getPath(await jsonObject(blockedDelete), "error", "message")).toContain("patch-collection");
  });

  it("rejects a filter whose regular expression does not compile", async () => {
    const create = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "regex-source",
        name: "Regex Source",
        type: "local",
        content: "trojan://password@example.com:443#Node",
        filters: [{ type: "exclude", field: "name", pattern: "(" }],
      }),
    });
    expect(create.status).toBe(400);
    expect(getPath(await jsonObject(create), "error", "message")).toContain("invalid regular expression: (");

    const valid = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "regex-source-ok",
        name: "Regex Source OK",
        type: "local",
        content: "trojan://password@example.com:443#Node",
        filters: [
          { type: "exclude", field: "name", pattern: "(?i)官网" },
          { type: "rename", pattern: "^(.)", replacement: "[$1]" },
        ],
      }),
    });
    expect(valid.status).toBe(200);
  });

  it("keeps only the field that matches the source type", async () => {
    const create = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "mode-source",
        name: "Mode Source",
        type: "local",
        url: "https://leftover.example/sub",
        content: "trojan://password@example.com:443#Local%20Node",
      }),
    });
    expect(create.status).toBe(200);
    const created = getPath(await jsonObject(create), "data") as Record<string, unknown>;
    expect(created.url).toBe("");

    const toRemote = await workerRequest("/api/sources/mode-source", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "remote", url: "https://remote.example/sub" }),
    });
    const remote = getPath(await jsonObject(toRemote), "data") as Record<string, unknown>;
    expect(remote.type).toBe("remote");
    expect(remote.content).toBe("");

    const backToLocal = await workerRequest("/api/sources/mode-source", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "local", content: "trojan://password@example.com:443#Back%20Local" }),
    });
    const local = getPath(await jsonObject(backToLocal), "data") as Record<string, unknown>;
    expect(local.type).toBe("local");
    expect(local.url).toBe("");
    expect(String(local.content)).toContain("Back%20Local");
  });

  it("treats an empty sourceIds list as all enabled sources", async () => {
    for (const [id, nodeName] of [["all-source-a", "All Node A"], ["all-source-b", "All Node B"]]) {
      const response = await workerRequest("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          name: id,
          type: "local",
          content: `trojan://password@example.com:443#${encodeURIComponent(nodeName)}`,
          enabled: true,
        }),
      });
      expect(response.status).toBe(200);
    }

    const collection = await workerRequest("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "all-enabled",
        name: "All Enabled",
        sourceIds: [],
        templateId: "mihomo-basic",
        enabled: true,
      }),
    });
    expect(collection.status).toBe(200);

    const download = await workerRequest(`/download/collection/all-enabled/json/${DOWNLOAD_TOKEN}`, {}, false);
    expect(download.status).toBe(200);
    const body = await download.text();
    expect(body).toContain("All Node A");
    expect(body).toContain("All Node B");
  });

  it("rejects invalid and duplicate record ids", async () => {
    const invalid = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "Invalid ID",
        name: "Invalid",
        type: "local",
        content: "trojan://password@example.com:443#Invalid",
      }),
    });
    expect(invalid.status).toBe(400);

    const invalidType = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "invalid-type", name: "Invalid", type: "file", content: "x" }),
    });
    expect(invalidType.status).toBe(400);

    const invalidSourceIds = await workerRequest("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "invalid-source-ids",
        name: "Invalid",
        sourceIds: "all-source-a",
        templateId: "mihomo-basic",
      }),
    });
    expect(invalidSourceIds.status).toBe(400);

    const duplicatePayload = JSON.stringify({
      id: "duplicate-source",
      name: "Duplicate",
      type: "local",
      content: "trojan://password@example.com:443#Duplicate",
    });
    const first = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: duplicatePayload,
    });
    expect(first.status).toBe(200);

    const duplicate = await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: duplicatePayload,
    });
    expect(duplicate.status).toBe(409);
  });

  it("serves code-owned built-ins and restores custom storage in one request", async () => {
    const templatesResponse = await workerRequest("/api/templates");
    const initialTemplates = getPath(await jsonObject(templatesResponse), "data");
    expect(Array.isArray(initialTemplates) ? initialTemplates.length : 0).toBe(6);

    const restoreResponse = await workerRequest("/api/storage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settings: { defaultTimeout: "15000" },
        sources: [{
          id: "test-local",
          name: "Test Local",
          type: "local",
          content: "vless://00000000-0000-4000-8000-000000000001@example.com:443?security=tls#Test%20Node",
          enabled: true,
        }, {
          // A backup written before the type was enforced may carry both fields.
          id: "test-remote",
          name: "Test Remote",
          type: "remote",
          url: "https://remote.example/sub",
          content: "vless://00000000-0000-4000-8000-000000000002@example.com:443#Stale%20Node",
          // Restoring a backup has to keep the disabled state the user set.
          enabled: false,
        }],
        templates: [{
          id: "test-template",
          name: "Test Template",
          target: "mihomo",
          config: {
            proxyGroups: [{ name: "Proxy", type: "select", proxies: ["$all"] }],
            rules: ["MATCH,Proxy"],
          },
        }],
        collections: [{
          id: "test-collection",
          name: "Test Collection",
          sourceIds: ["test-local"],
          templateId: "test-template",
          enabled: true,
        }],
      }),
    });
    expect(restoreResponse.status).toBe(200);
    expect(getPath(await jsonObject(restoreResponse), "data", "sources")).toBe(2);

    const restoredRemote = getPath(await jsonObject(await workerRequest("/api/sources/test-remote")), "data") as Record<string, unknown>;
    expect(restoredRemote.content).toBe("");
    expect(restoredRemote.enabled).toBe(false);

    const customCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM templates WHERE id = 'test-template'").first("count");
    expect(customCount).toBe(1);

    const download = await workerRequest(
      `/download/collection/test-collection/mihomo/${DOWNLOAD_TOKEN}`,
      {},
      false,
    );
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toContain("text/yaml");
    expect(await download.text()).toContain("Test Node");
  });

  it("explains a download link that points at a disabled record", async () => {
    await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "disabled-source",
        name: "Disabled Source",
        type: "local",
        content: "trojan://password@example.com:443#Node",
        enabled: false,
      }),
    });
    const source = await workerRequest(`/download/source/disabled-source/mihomo/${DOWNLOAD_TOKEN}`, {}, false);
    expect(source.status).toBe(404);
    expect(getPath(await jsonObject(source), "error", "message")).toBe("Subscription is disabled");

    await workerRequest("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "disabled-collection", name: "Disabled Collection", sourceIds: [], templateId: "mihomo-basic", enabled: false }),
    });
    const collection = await workerRequest(`/download/collection/disabled-collection/mihomo/${DOWNLOAD_TOKEN}`, {}, false);
    expect(collection.status).toBe(404);
    expect(getPath(await jsonObject(collection), "error", "message")).toBe("Collection is disabled");
  });

  it("rejects oversized API bodies", async () => {
    const response = await workerRequest("/api/storage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(4 * 1024 * 1024) }),
    });
    expect(response.status).toBe(413);
  });

  it("converts proxies and rules without saving records", async () => {
    const proxy = await workerRequest("/api/proxy/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: "trojan://password@example.com:443#One%20Shot",
        target: "surge-mac",
      }),
    });
    expect(proxy.status).toBe(200);
    expect(getPath(await jsonObject(proxy), "data", "content")).toContain("One Shot");

    const rules = await workerRequest("/api/rule/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "DOMAIN-SUFFIX,example.com,Proxy", target: "qx" }),
    });
    expect(rules.status).toBe(200);
    expect(getPath(await jsonObject(rules), "data", "content")).toContain("HOST-SUFFIX");
  });

  it("creates scoped share links and enforces resource and target restrictions", async () => {
    await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "shared-source",
        name: "Shared Source",
        type: "local",
        content: "trojan://password@example.com:443#Shared%20Node",
      }),
    });
    const create = await workerRequest("/api/shares", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resourceType: "source", resourceId: "shared-source", target: "json", expiresIn: 3600 }),
    });
    expect(create.status).toBe(200);
    const payload = await jsonObject(create);
    const token = String(getPath(payload, "data", "token"));
    const id = String(getPath(payload, "data", "id"));
    expect(token.length).toBeGreaterThan(20);

    const allowed = await workerRequest(`/download/source/shared-source/json?token=${encodeURIComponent(token)}`, {}, false);
    expect(allowed.status).toBe(200);
    const wrongTarget = await workerRequest(`/download/source/shared-source/mihomo?token=${encodeURIComponent(token)}`, {}, false);
    expect(wrongTarget.status).toBe(403);

    await workerRequest(`/api/shares/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    const disabled = await workerRequest(`/download/source/shared-source/json?token=${encodeURIComponent(token)}`, {}, false);
    expect(disabled.status).toBe(403);
  });

  it("archives deleted configuration and restores it without overwrite", async () => {
    await workerRequest("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "recycled-source",
        name: "Recycled Source",
        type: "local",
        content: "trojan://password@example.com:443#Recycle%20Node",
      }),
    });
    expect((await workerRequest("/api/sources/recycled-source", { method: "DELETE" })).status).toBe(200);
    expect((await workerRequest("/api/sources/recycled-source")).status).toBe(404);

    const recycle = await workerRequest("/api/recycle-bin");
    const entries = getPath(await jsonObject(recycle), "data");
    const entry = Array.isArray(entries) ? entries.find((item) => getPath(item, "resourceId") === "recycled-source") : undefined;
    expect(entry).toBeTruthy();
    // The list is what the Tools page renders: no snapshot, but the display name.
    expect(getPath(entry, "snapshot")).toBeUndefined();
    expect(getPath(entry, "name")).toBe("Recycled Source");
    const entryId = String(getPath(entry, "id"));
    expect((await workerRequest(`/api/recycle-bin/${entryId}/restore`, { method: "POST" })).status).toBe(200);
    expect((await workerRequest("/api/sources/recycled-source")).status).toBe(200);
  });

  it("serves converted Clash rule providers to sing-box", async () => {
    const created = await workerRequest("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "ruleset-test", name: "Ruleset Test", templateId: "loyalsoldier-whitelist", sourceIds: [] }),
    });
    expect(created.status).toBeLessThan(300);

    // The response has to be created inside the request handler: workers reject
    // reading a stream that was created in another request's context.
    const providerFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(
      ["payload:", "  - '+.example.com'", "  - '10.0.0.0/8'", "  - DOMAIN-KEYWORD,ads", ""].join("\n"),
      { status: 200 },
    ));
    const converted = await workerRequest("/download/collection/ruleset-test/ruleset/reject?token=test-download-token", {}, false);
    expect(converted.status).toBe(200);
    expect(converted.headers.get("content-type")).toContain("application/json");
    expect(await converted.json()).toEqual({
      version: 1,
      rules: [
        { domain_suffix: ["example.com"] },
        { ip_cidr: ["10.0.0.0/8"] },
        { domain_keyword: ["ads"] },
      ],
    });
    providerFetch.mockRestore();

    const unknownProvider = await workerRequest("/download/collection/ruleset-test/ruleset/missing?token=test-download-token", {}, false);
    expect(unknownProvider.status).toBe(404);
    const invalidToken = await workerRequest("/download/collection/ruleset-test/ruleset/reject", {}, false);
    expect(invalidToken.status).toBe(403);
  });

  it("follows the client core version for the sing-box rule-set download channel", async () => {
    const created = await workerRequest("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "sing-box-ua", name: "Sing Box UA", templateId: "loyalsoldier-whitelist", sourceIds: [] }),
    });
    expect(created.status).toBeLessThan(300);

    type Profile = {
      http_clients?: Array<Record<string, unknown>>;
      experimental?: Record<string, unknown>;
      dns: { servers: Array<Record<string, unknown>>; rules?: Array<Record<string, unknown>>; final?: string };
      route: {
        default_http_client?: string;
        rule_set?: Array<Record<string, unknown>>;
        rules: Array<Record<string, unknown>>;
      };
    };
    const profile = async (userAgent?: string) => {
      const response = await workerRequest(
        `/download/collection/sing-box-ua/sing-box/${DOWNLOAD_TOKEN}`,
        userAgent ? { headers: { "user-agent": userAgent } } : {},
        false,
      );
      expect(response.status).toBe(200);
      return JSON.parse(await response.text()) as Profile;
    };

    // The Apple and Android clients report the core version, so 1.14+ gets the
    // shared HTTP client and no `download_detour` (the 1.14 migration warning).
    const modern = await profile("SFI (sing-box 1.14.2; language zh_CN)");
    expect(modern.http_clients).toEqual([{ tag: "rule-set-download", detour: "DIRECT" }]);
    expect(modern.route.default_http_client).toBe("rule-set-download");
    expect(modern.route.rule_set?.length).toBeGreaterThan(0);
    expect(modern.route.rule_set?.every((entry) => entry.download_detour === undefined)).toBe(true);

    // Older cores reject `http_clients` as an unknown field, and clients that
    // hide their version keep the legacy form as well.
    for (const userAgent of ["SFA (sing-box 1.13.0; language zh_CN)", undefined]) {
      const legacy = await profile(userAgent);
      expect(legacy.http_clients, `http_clients for ${userAgent}`).toBeUndefined();
      expect(legacy.route.default_http_client).toBeUndefined();
      expect(legacy.route.rule_set?.every((entry) => entry.download_detour === "DIRECT")).toBe(true);
    }

    // `?singboxHttpClients=` overrides the User-Agent detection.
    const forced = await workerRequest(
      `/download/collection/sing-box-ua/sing-box/${DOWNLOAD_TOKEN}?singboxHttpClients=1`,
      {},
      false,
    );
    expect(forced.status).toBe(200);
    expect((JSON.parse(await forced.text()) as Profile).http_clients).toBeTruthy();

    // The link also carries the dual-stack fake-ip DNS setup, which does not
    // depend on the client version.
    expect(modern.dns.servers.at(-1)).toEqual({
      tag: "dns-fakeip",
      type: "fakeip",
      inet4_range: "198.18.0.0/15",
      inet6_range: "fc00::/18",
    });
    expect(modern.dns.rules).toEqual([
      // The 1.14 core splits Chinese answers out of fake-ip in the DNS layer, so
      // no route-level resolve action is needed.
      { query_type: ["A", "AAAA"], action: "evaluate", server: "dns-bootstrap" },
      { query_type: ["A", "AAAA"], match_response: true, rule_set: ["geoip-cn"], action: "respond" },
      { query_type: ["A", "AAAA"], action: "route", server: "dns-fakeip" },
    ]);
    expect(modern.experimental).toEqual({ cache_file: { enabled: true, path: "cache.db", store_fakeip: true } });
    expect(modern.route.rules.some((rule) => rule.action === "resolve")).toBe(false);
    // The Loyalsoldier template's `GEOIP,CN` already provides the CN rule set
    // the split matches against.
    expect(modern.route.rule_set?.filter((entry) => entry.tag === "geoip-cn")).toHaveLength(1);

    // Older cores keep the route-level resolve action instead of the split.
    const olderProfile = await profile("SFA (sing-box 1.13.0; language zh_CN)");
    expect(olderProfile.dns.rules).toEqual([{ query_type: ["A", "AAAA"], server: "dns-fakeip" }]);
    expect(olderProfile.route.rules.filter((rule) => rule.action === "resolve"))
      .toEqual([{ action: "resolve", server: "dns-bootstrap" }]);
    expect(olderProfile.route.rules.findIndex((rule) => rule.action === "resolve"))
      .toBeLessThan(olderProfile.route.rules.findIndex((rule) => Array.isArray(rule.rule_set) && (rule.rule_set as string[]).includes("cncidr")));

    const noFakeIp = await workerRequest(
      `/download/collection/sing-box-ua/sing-box/${DOWNLOAD_TOKEN}?singboxFakeIp=0`,
      {},
      false,
    );
    const noFakeIpProfile = JSON.parse(await noFakeIp.text()) as Profile;
    expect(noFakeIpProfile.dns.servers).toHaveLength(2);
    expect(noFakeIpProfile.dns.rules).toBeUndefined();
    expect(noFakeIpProfile.experimental).toBeUndefined();
  });
});

async function workerRequest(path: string, init: RequestInit = {}, includeAdmin = true) {
  const headers = new Headers(init.headers);
  if (includeAdmin) headers.set("authorization", `Bearer ${ADMIN_TOKEN}`);
  return workerExports.default.fetch(new Request(`https://example.com${path}`, { ...init, headers }));
}

async function jsonObject(response: Response) {
  const input: unknown = await response.json();
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected a JSON object");
  return input as Record<string, unknown>;
}

function getPath(input: Record<string, unknown>, ...path: string[]): unknown {
  let current: unknown = input;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = Reflect.get(current, key);
  }
  return current;
}
