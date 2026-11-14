import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { stripJsonComments } from "./lib/jsonc.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const outputArg = readOutputArg(args);
const databaseId = readDatabaseId(args);
const root = readRootConfig();
if (!databaseId) {
  throw new Error("D1 database id is required. Set CLOUDFLARE_D1_DATABASE_ID or run the local installer first.");
}
if (!(root.d1_databases || []).some((database) => database?.binding === "DB")) {
  throw new Error('wrangler.jsonc must declare the "DB" D1 binding.');
}

const local = readLocalConfig();
const routes = readRoutes(root, local);
const vars = readVars(root, local);

const workersDev = readWorkersDev();
if (!workersDev && routes.length === 0) {
  throw new Error("SUB_STORE_WORKERS_DEV=0 requires SUB_STORE_ADMIN_HOSTNAME or SUB_STORE_DOWNLOAD_HOSTNAME.");
}

const config = {
  ...root,
  $schema: "./node_modules/wrangler/config-schema.json",
  main: "src/index.ts",
  workers_dev: routes.length > 0 ? false : workersDev,
  assets: {
    ...root.assets,
    directory: "../frontend/dist",
  },
  d1_databases: (root.d1_databases || []).map((database) =>
    database?.binding === "DB"
      ? { ...database, database_id: databaseId, migrations_dir: "./migrations" }
      : database,
  ),
  ...(routes.length > 0 ? { routes } : { routes: undefined }),
  ...(Object.keys(vars).length > 0 ? { vars } : { vars: undefined }),
};

const outputPath = resolve(outputArg);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      output: outputArg,
      databaseName: config.d1_databases?.find((database) => database?.binding === "DB")?.database_name,
      workersDev: config.workers_dev,
      routes: routes.length,
      vars: Object.keys(vars),
    },
    null,
    2,
  ),
);

function readOutputArg(input) {
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "--database-id") {
      index += 1;
      continue;
    }
    if (!input[index].startsWith("--")) return input[index];
  }
  return "cloudflare/wrangler.deploy.build.jsonc";
}

function readDatabaseId(input) {
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "--database-id") return stringValue(input[index + 1]);
  }
  return stringValue(process.env.CLOUDFLARE_D1_DATABASE_ID)
    || stringValue(readLocalConfig()?.d1_databases?.find((database) => database?.binding === "DB")?.database_id);
}

function readRootConfig() {
  try {
    return JSON.parse(stripJsonComments(readFileSync("wrangler.jsonc", "utf8")));
  } catch (error) {
    throw new Error(`wrangler.jsonc is missing or invalid: ${error.message}`);
  }
}

function readLocalConfig() {
  const path = "cloudflare/wrangler.deploy.local.jsonc";
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(stripJsonComments(readFileSync(path, "utf8")));
  } catch {
    return undefined;
  }
}

function readRoutes(root, local) {
  const routes = [
    ...(Array.isArray(root.routes) ? root.routes : []),
    ...(Array.isArray(local?.routes) ? local.routes : []),
  ];
  const adminHostname = readHostname("SUB_STORE_ADMIN_HOSTNAME");
  const downloadHostname = readHostname("SUB_STORE_DOWNLOAD_HOSTNAME");

  for (const hostname of [adminHostname, downloadHostname]) {
    if (hostname && !hostname.endsWith(".workers.dev") && !routes.some((route) => route?.pattern === hostname)) {
      routes.push({ pattern: hostname, custom_domain: true });
    }
  }
  return routes.filter((route, index) =>
    Boolean(route?.pattern) && routes.findIndex((item) => item?.pattern === route.pattern) === index,
  );
}

function readHostname(key) {
  const value = stringValue(process.env[key]);
  if (!value) return "";
  if (value.includes("://") || value.includes("/")) {
    throw new Error(`${key} must be a hostname without a protocol or path.`);
  }
  return value;
}

function readVars(root, local) {
  const vars = { ...(root.vars || {}), ...(local?.vars || {}) };
  for (const key of Object.keys(vars)) {
    if (process.env[key] !== undefined) vars[key] = process.env[key];
    if (!String(vars[key] ?? "").trim()) delete vars[key];
  }
  return vars;
}

function readWorkersDev() {
  const value = process.env.SUB_STORE_WORKERS_DEV;
  if (value === undefined) return true;
  return /^(1|true|yes)$/i.test(value.trim());
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
