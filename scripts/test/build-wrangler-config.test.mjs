import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/render-build-wrangler-config.mjs");
const rootConfig = `{
  // Root config is the deployment-neutral template.
  "name": "test-worker",
  "main": "cloudflare/src/index.ts",
  "workers_dev": true,
  "compatibility_date": "2026-07-08",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "frontend/dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": true
  },
  "secrets": { "required": ["ADMIN"] },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "test-db",
    "database_id": "00000000-0000-0000-0000-000000000000",
    "migrations_dir": "cloudflare/migrations"
  }],
  "vars": {
    "SUB_STORE_APP_NAME": "Test",
    "SUB_STORE_PUBLIC_DOWNLOAD_HOSTS": ""
  }
}`;

test("renders a deployable config from the root template", () => {
  const { result, config } = run(["--database-id", "11111111-1111-1111-1111-111111111111"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(config.main, "src/index.ts");
  assert.equal(config.$schema, "./node_modules/wrangler/config-schema.json");
  assert.equal(config.assets.directory, "../frontend/dist");
  assert.equal(config.d1_databases[0].database_id, "11111111-1111-1111-1111-111111111111");
  assert.equal(config.d1_databases[0].migrations_dir, "./migrations");
  assert.equal(config.workers_dev, true);
  assert.deepEqual(config.vars, { SUB_STORE_APP_NAME: "Test" });
});

test("applies build environment overrides and custom-domain routes", () => {
  const { result, config } = run(["--database-id", "22222222-2222-2222-2222-222222222222"], {
    SUB_STORE_APP_NAME: "Custom",
    SUB_STORE_PUBLIC_DOWNLOAD_HOSTS: "download.example.com",
    SUB_STORE_WORKERS_DEV: "0",
    SUB_STORE_ADMIN_HOSTNAME: "admin.example.com",
    SUB_STORE_DOWNLOAD_HOSTNAME: "download.example.com",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(config.workers_dev, false);
  assert.deepEqual(config.routes, [
    { pattern: "admin.example.com", custom_domain: true },
    { pattern: "download.example.com", custom_domain: true },
  ]);
  assert.deepEqual(config.vars, {
    SUB_STORE_APP_NAME: "Custom",
    SUB_STORE_PUBLIC_DOWNLOAD_HOSTS: "download.example.com",
  });
});

test("requires a real D1 id", () => {
  const { result } = run([]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /D1 database id is required/);
});

test("rejects workers_dev=0 without a route", () => {
  const { result } = run(["--database-id", "33333333-3333-3333-3333-333333333333"], {
    SUB_STORE_WORKERS_DEV: "0",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SUB_STORE_WORKERS_DEV=0 requires/);
});

function run(args, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sub-store-build-config-"));
  writeFileSync(join(dir, "wrangler.jsonc"), rootConfig);
  const output = join(dir, "wrangler.deploy.build.jsonc");
  const result = spawnSync(process.execPath, [script, output, ...args], {
    cwd: dir,
    env: {
      ...process.env,
      CLOUDFLARE_D1_DATABASE_ID: "",
      ...env,
    },
    encoding: "utf8",
  });
  const config = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : undefined;
  return { result, config };
}
