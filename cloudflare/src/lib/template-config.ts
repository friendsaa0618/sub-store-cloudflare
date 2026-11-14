import { parse as parseYaml } from "yaml";

type JsonObject = Record<string, unknown>;

/**
 * Mihomo accepts both dashed YAML keys and the camelCase names the admin UI
 * uses. Normalize the aliases once so every caller stores the same shape.
 */
export function normalizeMihomoTemplateConfig(input: JsonObject) {
  const output: JsonObject = { ...input };
  copyAlias(output, "mixed-port", "mixedPort");
  copyAlias(output, "allow-lan", "allowLan");
  copyAlias(output, "log-level", "logLevel");
  copyAlias(output, "proxy-groups", "proxyGroups");
  copyAlias(output, "rule-providers", "ruleProviders");
  return output;
}

/** Parse a template body from the admin API, rejecting anything that is not an object. */
export function parseTemplateConfig(input: unknown) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return normalizeMihomoTemplateConfig(input as JsonObject);
  }
  if (typeof input !== "string" || !input.trim()) throw new Error("Template config is required");
  try {
    const parsed = input.trim().startsWith("{") ? JSON.parse(input) : parseYaml(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return normalizeMihomoTemplateConfig(parsed as JsonObject);
    }
  } catch {
    throw new Error("Template config must be valid JSON or YAML");
  }
  throw new Error("Template config must be an object");
}

function copyAlias(input: JsonObject, from: string, to: string) {
  if (input[to] === undefined && input[from] !== undefined) input[to] = input[from];
  delete input[from];
}
