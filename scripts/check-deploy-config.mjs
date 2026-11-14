import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { stripJsonComments } from "./lib/jsonc.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const required = args.includes("--required");
const [configPath = "cloudflare/wrangler.deploy.local.jsonc"] = args.filter((arg) => arg !== "--required");

if (!existsSync(configPath)) {
  if (!required) {
    console.log(`${configPath}: skipped local deployment config scan.`);
    process.exit(0);
  }
  console.error(`${configPath}: missing local deployment config. Run pnpm run deploy:config first.`);
  process.exit(1);
}

const config = parseJsonc(readFileSync(configPath, "utf8"), configPath);
const assets = config.assets;
const isRootConfig = resolve(configPath) === resolve("wrangler.jsonc");
const expectedAssetDirectory = isRootConfig ? "frontend/dist" : "../frontend/dist";
const findings = [];
const rootConfig = readConfig("wrangler.jsonc");
const workerConfig = readConfig("cloudflare/wrangler.jsonc");

if (rootConfig.compatibility_date !== workerConfig.compatibility_date) {
  findings.push("root and cloudflare compatibility_date values must match");
}
if (!sameStrings(rootConfig.compatibility_flags, workerConfig.compatibility_flags)) {
  findings.push("root and cloudflare compatibility_flags values must match");
}
if (config.compatibility_date !== rootConfig.compatibility_date) {
  findings.push(`compatibility_date must be "${rootConfig.compatibility_date}"`);
}
if (!sameStrings(config.compatibility_flags, rootConfig.compatibility_flags)) {
  findings.push(`compatibility_flags must match root config (${stringList(rootConfig.compatibility_flags).join(", ")})`);
}
if (!stringList(config.compatibility_flags).includes("nodejs_compat")) {
  findings.push('compatibility_flags must include "nodejs_compat"');
}

if (!assets || typeof assets !== "object") {
  findings.push("assets config is missing");
} else {
  if (assets.directory !== expectedAssetDirectory) {
    findings.push(`assets.directory must be "${expectedAssetDirectory}"`);
  }
  if (assets.binding !== "ASSETS") {
    findings.push('assets.binding must be "ASSETS"');
  }
  if (assets.not_found_handling !== "single-page-application") {
    findings.push('assets.not_found_handling must be "single-page-application"');
  }
  // `true` (every request through the Worker) or the explicit route list the
  // production config uses to keep static assets on the asset server.
  const workerFirst = assets.run_worker_first;
  const validWorkerFirst = workerFirst === true
    || (Array.isArray(workerFirst) && workerFirst.length > 0 && workerFirst.every((route) => typeof route === "string"));
  if (!validWorkerFirst) {
    findings.push("assets.run_worker_first must be true or a non-empty route list");
  }
}

if (config.workers_dev === false && !(Array.isArray(config.routes) && config.routes.length > 0)) {
  findings.push("workers_dev is false but no routes are configured; the Worker would have no public hostname");
}
if (isRootConfig && config.workers_dev !== true) {
  findings.push("root wrangler.jsonc workers_dev must be true for the Deploy to Cloudflare path");
}

const dbBinding = Array.isArray(config.d1_databases)
  ? config.d1_databases.find((entry) => entry && entry.binding === "DB")
  : undefined;
if (!dbBinding) {
  findings.push('d1_databases must declare the "DB" binding');
}
if (isRootConfig && dbBinding && String(dbBinding.database_id || "") !== "00000000-0000-0000-0000-000000000000") {
  findings.push("root wrangler.jsonc database_id must be the all-zero placeholder; real IDs belong in cloudflare/wrangler.deploy.local.jsonc");
}

if (isRootConfig) {
  const vars = config.vars && typeof config.vars === "object" ? config.vars : {};
  for (const key of ["SUB_STORE_PUBLIC_DOWNLOAD_HOSTS", "SUB_STORE_ACCESS_TEAM_DOMAIN", "SUB_STORE_ACCESS_AUD"]) {
    if (String(vars[key] || "").trim()) {
      findings.push(`root wrangler.jsonc vars.${key} must be empty; deployment-specific values belong in the local config`);
    }
  }
}

if (findings.length > 0) {
  console.error(`${configPath}: invalid deployment config`);
  console.error(findings.map((finding) => `- ${finding}`).join("\n"));
  process.exit(1);
}

console.log(`${configPath}: deployment config scan passed.`);

function parseJsonc(text, file) {
  try {
    return JSON.parse(stripJsonComments(text));
  } catch (error) {
    console.error(`${file}: invalid JSONC: ${error.message}`);
    process.exit(1);
  }
}

function readConfig(path) {
  if (!existsSync(path)) {
    console.error(`${path}: missing canonical Wrangler config`);
    process.exit(1);
  }
  return parseJsonc(readFileSync(path, "utf8"), path);
}

function stringList(input) {
  return Array.isArray(input) ? input.map(String).sort() : [];
}

function sameStrings(left, right) {
  return JSON.stringify(stringList(left)) === JSON.stringify(stringList(right));
}
