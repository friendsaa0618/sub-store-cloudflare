#!/usr/bin/env node
/**
 * Repeatable benchmark for the subscription hot path.
 *
 * It generates deterministic local sources (URI lines, duplicate names,
 * duplicate endpoints), runs the same filters a real collection would use
 * (delete-field, dedupe, regex-sort, sort), and measures:
 *
 *   - buildSubscription(): source parsing -> per-source filters -> collection
 *     filters -> unique names -> Mihomo YAML rendering.
 *   - convertSubscriptionContent(): one-shot parse -> filters -> unique names
 *     -> Mihomo YAML rendering.
 *
 * Run it with:
 *
 *   pnpm run bench:subscription
 *
 * The script imports the Worker TypeScript directly. Node strips the types;
 * a resolve hook below only fills in the extensionless relative imports that
 * the Worker bundler normally resolves.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_NODE_COUNTS = [1000, 5000];
const DEFAULT_RUNS = 5;
const DEFAULT_WARMUP = 2;
const DEFAULT_SEED = 20261114;
const TEMPLATE_ID = "acl4ssr-mihomo";
const TARGET = "mihomo";
const REGIONS = ["HK", "JP", "SG", "US", "TW", "KR"];
const PROTOCOLS = ["trojan", "vless", "vmess", "ss"];

const SOURCE_FILTERS = [
  { type: "delete-field", field: "name", patterns: ["\\s*\\[1x\\]$"] },
  { type: "dedupe", fields: ["server", "port"] },
  { type: "regex-sort", expressions: ["HK", "JP", "SG", "US"], direction: "asc" },
];
const COLLECTION_FILTERS = [
  { type: "dedupe", fields: ["name", "server", "port"] },
  { type: "sort", direction: "asc" },
];
const CONVERT_FILTERS = [...SOURCE_FILTERS, ...COLLECTION_FILTERS];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.endsWith(".ts")
      && (specifier.startsWith("./") || specifier.startsWith("../"))
      && !/\.[a-z]+$/i.test(specifier)
    ) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

if (!process.features.typescript) {
  console.error("This benchmark imports the Worker TypeScript directly and needs Node's built-in type stripping.");
  console.error("Use Node 22.18+ (Node 26 is the supported toolchain for this repository).");
  process.exit(1);
}

const registryPath = fileURLToPath(new URL("../cloudflare/src/generated/script-registry.ts", import.meta.url));
if (!existsSync(registryPath)) {
  // The hot path imports the script registry, but this benchmark never runs a
  // script filter. Generate the registry quietly instead of making the caller
  // run a separate step before a benchmark or a `--json` run.
  execFileSync(process.execPath, [fileURLToPath(new URL("./generate-script-registry.mjs", import.meta.url))], {
    stdio: "ignore",
  });
}

const { buildSubscription, buildSubscriptionResult, convertSubscriptionContent } = await import(
  new URL("../cloudflare/src/lib/subscription.ts", import.meta.url).href
);
const { BUILTIN_TEMPLATES } = await import(new URL("../cloudflare/src/lib/defaults.ts", import.meta.url).href);

const template = BUILTIN_TEMPLATES.find((item) => item.id === TEMPLATE_ID);
if (!template) throw new Error(`Built-in template ${TEMPLATE_ID} is missing`);

const report = {
  environment: {
    node: process.version,
    pnpm: process.env.npm_config_user_agent?.match(/pnpm\/([^\s]+)/)?.[1] || "unknown",
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model?.trim() || "unknown",
    gc: typeof globalThis.gc === "function",
  },
  settings: {
    nodeCounts: options.nodeCounts,
    runs: options.runs,
    warmup: options.warmup,
    seed: options.seed,
    target: TARGET,
    template: TEMPLATE_ID,
    filters: { source: SOURCE_FILTERS, collection: COLLECTION_FILTERS },
  },
  fixtures: [],
};

for (const nodeCount of options.nodeCounts) {
  const fixture = createFixture(nodeCount, options.seed);
  const buildOptions = {
    collection: fixture.collection,
    sources: fixture.sources,
    requestUrl: fixture.requestUrl,
    target: TARGET,
    template,
  };

  // One untimed result call gives the emitted node count without changing the
  // measured buildSubscription() path.
  const buildInfo = await buildSubscriptionResult(buildOptions);
  if (buildInfo.nodes === 0) throw new Error(`buildSubscription emitted no nodes for ${nodeCount} inputs`);

  const build = await measure("buildSubscription", () => buildSubscription(buildOptions), options);
  const convert = await measure(
    "convertSubscriptionContent",
    () => convertSubscriptionContent({
      content: fixture.content,
      target: TARGET,
      filters: CONVERT_FILTERS,
      template,
    }),
    options,
  );

  report.fixtures.push({
    nodeCount,
    sourceCount: fixture.sources.length,
    inputBytes: Buffer.byteLength(fixture.content),
    build: { ...build, emittedNodes: buildInfo.nodes },
    convert: {
      ...convert,
      emittedNodes: convert.emittedNodes ?? buildInfo.nodes,
      parsedNodes: convert.parsedNodes ?? buildInfo.nodes,
    },
  });
}

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

function createFixture(nodeCount, seed) {
  const primaryCount = Math.ceil(nodeCount * 0.6);
  const secondaryCount = nodeCount - primaryCount;
  const primary = createSource({ id: "primary", count: primaryCount, seed: seed ^ 0x9e3779b9 });
  const secondary = createSource({
    id: "secondary",
    count: secondaryCount,
    seed: seed ^ 0x85ebca6b,
    sharedNames: primary.names.slice(0, Math.floor(primaryCount / 4)),
  });
  const sources = [primary.source, secondary.source];
  const collection = {
    id: "benchmark-collection",
    name: "Benchmark Collection",
    sourceIds: [],
    filters: COLLECTION_FILTERS,
    enabled: true,
  };

  return {
    sources,
    collection,
    content: sources.map((source) => source.content).join("\n"),
    requestUrl: new URL(`https://benchmark.invalid/download/collection/${collection.id}/${TARGET}`),
  };
}

function createSource({ id, count, seed, sharedNames = [] }) {
  const random = createRandom(seed);
  const lines = [];
  const names = [];
  let previousEndpoint;

  for (let index = 0; index < count; index += 1) {
    const region = REGIONS[(index + id.length) % REGIONS.length];
    let name;
    if (index < sharedNames.length) {
      // Cross-source duplicate: same name as the primary source, new endpoint.
      name = sharedNames[index];
    } else if (index > 0 && index % 8 === 3) {
      // In-source duplicate name: same name as the previous node, new endpoint.
      name = names[index - 1];
    } else {
      name = `${region} ${String(Math.floor(index / 8) + 1).padStart(4, "0")}`;
    }
    names.push(name);

    let server = `node-${id}-${String(index + 1).padStart(5, "0")}.benchmark.example`;
    let port = 20000 + Math.floor(random() * 20000);
    if (previousEndpoint && index % 50 === 49) {
      // Duplicate endpoint: dedupe has something to remove.
      ({ server, port } = previousEndpoint);
    }
    previousEndpoint = { server, port };

    const displayName = `${name}${index % 3 === 0 ? " [1x]" : ""}`;
    lines.push(createUri({
      protocol: PROTOCOLS[index % PROTOCOLS.length],
      index,
      name: displayName,
      server,
      port,
    }));
  }

  return {
    names,
    source: {
      id: `benchmark-${id}`,
      name: `Benchmark ${id}`,
      type: "local",
      url: "",
      content: lines.join("\n"),
      enabled: true,
      filters: SOURCE_FILTERS,
    },
  };
}

function createUri({ protocol, index, name, server, port }) {
  const tag = encodeURIComponent(name);
  const uuid = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

  if (protocol === "trojan") {
    return `trojan://benchmark-password@${server}:${port}?sni=benchmark.example#${tag}`;
  }
  if (protocol === "vless") {
    return `vless://${uuid}@${server}:${port}?security=tls&sni=benchmark.example&type=ws&path=%2Fws#${tag}`;
  }
  if (protocol === "vmess") {
    const payload = {
      v: "2",
      ps: name,
      add: server,
      port: String(port),
      id: uuid,
      aid: "0",
      scy: "auto",
      net: "ws",
      type: "none",
      host: "benchmark.example",
      path: "/ws",
      tls: "tls",
      sni: "benchmark.example",
    };
    return `vmess://${Buffer.from(JSON.stringify(payload), "utf8").toString("base64")}`;
  }

  const userInfo = Buffer.from("aes-128-gcm:benchmark-password", "utf8").toString("base64url");
  return `ss://${userInfo}@${server}:${port}#${tag}`;
}

async function measure(label, fn, { runs, warmup }) {
  for (let index = 0; index < warmup; index += 1) await fn();

  // Start the timed series from a clean heap; warmup garbage otherwise makes
  // V8 collect during the samples and inflates every timing.
  globalThis.gc?.();
  const samples = [];
  const cpuSamples = [];
  let lastResult;
  for (let index = 0; index < runs; index += 1) {
    const cpuStartedAt = process.cpuUsage();
    const startedAt = performance.now();
    lastResult = await fn();
    samples.push(performance.now() - startedAt);
    const cpu = process.cpuUsage(cpuStartedAt);
    cpuSamples.push((cpu.user + cpu.system) / 1000);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const sortedCpu = [...cpuSamples].sort((a, b) => a - b);
  const output = typeof lastResult === "string" ? lastResult : lastResult?.content ?? "";
  const outputBytes = Buffer.byteLength(String(output));
  const emittedNodes = typeof lastResult === "object" ? lastResult?.emitted : undefined;
  const parsedNodes = typeof lastResult === "object" ? lastResult?.parsed : undefined;
  lastResult = undefined;

  // Keep the probe result referenced through the final GC so `retained`
  // describes the live output instead of a freed temporary.
  globalThis.gc?.();
  const baseline = process.memoryUsage();
  const probe = await fn();
  const afterRun = process.memoryUsage();
  globalThis.gc?.();
  const retained = process.memoryUsage();
  void probe;

  return {
    label,
    runs,
    warmup,
    samplesMs: samples.map(round),
    cpuSamplesMs: cpuSamples.map(round),
    medianMs: round(median(sorted)),
    minMs: round(sorted[0]),
    maxMs: round(sorted[sorted.length - 1]),
    meanMs: round(samples.reduce((total, value) => total + value, 0) / samples.length),
    cpuMedianMs: round(median(sortedCpu)),
    cpuMinMs: round(sortedCpu[0]),
    cpuMaxMs: round(sortedCpu[sortedCpu.length - 1]),
    outputBytes,
    peakHeapDeltaBytes: Math.max(0, afterRun.heapUsed - baseline.heapUsed),
    retainedHeapDeltaBytes: Math.max(0, retained.heapUsed - baseline.heapUsed),
    emittedNodes,
    parsedNodes,
    rssBytes: afterRun.rss,
  };
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function median(sorted) {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function parseArgs(argv) {
  const parsed = {
    nodeCounts: DEFAULT_NODE_COUNTS,
    runs: DEFAULT_RUNS,
    warmup: DEFAULT_WARMUP,
    seed: DEFAULT_SEED,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const equalIndex = argument.indexOf("=");
    const flag = equalIndex >= 0 ? argument.slice(0, equalIndex) : argument;
    const inlineValue = equalIndex >= 0 ? argument.slice(equalIndex + 1) : undefined;
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      if (index >= argv.length) throw new Error(`${flag} requires a value`);
      return argv[index];
    };

    if (argument === "--") continue;
    else if (flag === "--help" || flag === "-h") parsed.help = true;
    else if (flag === "--json") parsed.json = true;
    else if (flag === "--nodes") parsed.nodeCounts = parseNodeCounts(readValue());
    else if (flag === "--runs") parsed.runs = parsePositiveInteger(flag, readValue());
    else if (flag === "--warmup") parsed.warmup = parseNonNegativeInteger(flag, readValue());
    else if (flag === "--seed") parsed.seed = parsePositiveInteger(flag, readValue());
    else throw new Error(`Unknown option: ${argument}`);
  }

  return parsed;
}

function parseNodeCounts(value) {
  const counts = value.split(",").map((item) => parsePositiveInteger("--nodes", item.trim()));
  if (counts.length === 0) throw new Error("--nodes requires at least one count");
  return counts;
}

function parsePositiveInteger(flag, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} requires a positive integer`);
  return parsed;
}

function parseNonNegativeInteger(flag, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${flag} requires a non-negative integer`);
  return parsed;
}

function printHelp() {
  console.log(`Usage: pnpm run bench:subscription [options]

Options:
  --nodes <list>   Comma-separated node counts (default: ${DEFAULT_NODE_COUNTS.join(",")})
  --runs <n>       Measured runs per scenario (default: ${DEFAULT_RUNS})
  --warmup <n>     Warmup runs per scenario (default: ${DEFAULT_WARMUP})
  --seed <n>       Synthetic data seed (default: ${DEFAULT_SEED})
  --json           Print the full report as JSON
  -h, --help       Show this help`);
}

function printReport(result) {
  const { environment } = result;
  console.log("Subscription hot-path benchmark");
  console.log(`Node ${environment.node} · pnpm ${environment.pnpm} · ${environment.platform}/${environment.arch}`);
  console.log(`CPU: ${environment.cpu}`);
  console.log(`Seed ${result.settings.seed} · warmup ${result.settings.warmup} · runs ${result.settings.runs} · target ${result.settings.target} · template ${result.settings.template}`);
  if (!environment.gc) console.log("Memory: run through `pnpm run bench:subscription` for GC-assisted numbers.");

  for (const fixture of result.fixtures) {
    console.log("");
    console.log(`${fixture.nodeCount.toLocaleString("en-US")} synthetic nodes · ${fixture.sourceCount} local sources · ${formatBytes(fixture.inputBytes)} input`);
    printScenario(fixture.build);
    printScenario(fixture.convert);
  }
}

function printScenario(scenario) {
  const peak = `+${formatBytes(scenario.peakHeapDeltaBytes)} peak`;
  const retained = `+${formatBytes(scenario.retainedHeapDeltaBytes)} retained`;
  console.log(
    `  ${scenario.label.padEnd(26)} median ${formatMs(scenario.medianMs)} · cpu ${formatMs(scenario.cpuMedianMs)} · min ${formatMs(scenario.minMs)} · max ${formatMs(scenario.maxMs)} · ${scenario.emittedNodes} nodes · ${formatBytes(scenario.outputBytes)} output · ${peak} / ${retained}`,
  );
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
