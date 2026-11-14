import type { Context } from "hono";
import { BUILTIN_TEMPLATE_IDS } from "../../lib/defaults";
import { validateScriptActions } from "../../lib/scripts";
import { getTemplate, listSources, withoutOtherModeField } from "../../lib/store";
import { normalizeTargetAlias } from "../../lib/subscription";
import { normalizeTargetValue } from "../../lib/targets";
import { parseTemplateConfig } from "../../lib/template-config";
import { objectValue, stringArray, stringValue, type JsonMap } from "../../lib/values";
import type {
  CollectionRecord,
  FilterRule,
  RecycleBinRecord,
  SourceRecord,
  SubscriptionCollection,
  SubscriptionSource,
  SubscriptionTarget,
  TemplateRecord,
} from "../../types";

export type ApiContext = Context<{ Bindings: SubStoreEnv }>;

export function toApiSource(source: SourceRecord) {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.url,
    content: source.content,
    filters: source.filters,
    enabled: source.enabled,
    meta: source.meta,
  };
}

export function fromApiSource(input: JsonMap, partial = false): Partial<SourceRecord> {
  const id = stringValue(input.id || input.name);
  const name = partial ? stringValue(input.name) : stringValue(input.name || input.id);
  const output: Partial<SourceRecord> = {};
  if (!partial || id) output.id = id;
  if (!partial || name) output.name = name;
  if (!partial || "type" in input) output.type = input.type === "local" ? "local" : "remote";
  if (!partial || "url" in input) output.url = stringValue(input.url);
  if (!partial || "content" in input) output.content = stringValue(input.content);
  if (!partial || "enabled" in input) output.enabled = input.enabled !== false;
  if (!partial || "filters" in input || "process" in input) output.filters = filterList(input.filters, input.process);
  if (!partial || "meta" in input) output.meta = objectValue(input.meta);
  return output;
}

export function mergeSource(existing: SourceRecord, next: Partial<SourceRecord>) {
  return { ...existing, ...next, id: existing.id, meta: { ...existing.meta, ...next.meta } };
}

/** A snapshot can hold a whole subscription's node list; the list only shows
 *  these fields and restore reads the snapshot on the server. */
export function toRecycleSummary(entry: RecycleBinRecord) {
  return {
    id: entry.id,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    name: stringValue(entry.snapshot?.name) || undefined,
    deletedAt: entry.deletedAt,
  };
}

export function toApiCollection(collection: CollectionRecord) {
  return {
    id: collection.id,
    name: collection.name,
    sourceIds: collection.sourceIds,
    filters: collection.filters,
    templateId: collection.templateId,
    ignoreFailed: collection.ignoreFailed,
    enabled: collection.enabled,
    meta: collection.meta,
  };
}

export function fromApiCollection(input: JsonMap, partial = false): Partial<CollectionRecord> {
  const id = stringValue(input.id || input.name);
  const name = partial ? stringValue(input.name) : stringValue(input.name || input.id);
  const output: Partial<CollectionRecord> = {};
  if (!partial || id) output.id = id;
  if (!partial || name) output.name = name;
  if (!partial || "sourceIds" in input) output.sourceIds = stringArray(input.sourceIds);
  if (!partial || "filters" in input || "process" in input) output.filters = filterList(input.filters, input.process);
  if (!partial || "templateId" in input) output.templateId = stringValue(input.templateId) || undefined;
  if (!partial || "ignoreFailed" in input) output.ignoreFailed = input.ignoreFailed !== false;
  if (!partial || "enabled" in input) output.enabled = input.enabled !== false;
  if (!partial || "meta" in input) output.meta = objectValue(input.meta);
  return output;
}

export function mergeCollection(existing: CollectionRecord, next: Partial<CollectionRecord>) {
  return { ...existing, ...next, id: existing.id, meta: { ...existing.meta, ...next.meta } };
}

export function toApiTemplate(template: TemplateRecord) {
  return {
    id: template.id,
    name: template.name,
    target: template.target,
    config: template.config,
    readonly: BUILTIN_TEMPLATE_IDS.has(template.id),
  };
}

export function fromApiTemplate(input: JsonMap): Partial<TemplateRecord> {
  return {
    id: stringValue(input.id || input.name),
    name: stringValue(input.name || input.id),
    target: normalizeTargetValue(input.target),
    config: parseTemplateConfig(input.config ?? input.content),
  };
}

export function toSubscriptionSource(input: JsonMap): SubscriptionSource {
  const sub = fromApiSource(input);
  return {
    id: sub.id || "preview",
    name: sub.name || stringValue(input.name) || "Preview",
    type: sub.type || "remote",
    url: sub.url || "",
    content: sub.content || "",
    filters: sub.filters || [],
    enabled: sub.enabled !== false,
    meta: sub.meta || {},
  };
}

export function toSubscriptionCollection(input: JsonMap): SubscriptionCollection {
  const collection = fromApiCollection(input);
  return {
    id: collection.id || "preview",
    name: collection.name || stringValue(input.name) || "Preview",
    sourceIds: collection.sourceIds || [],
    filters: collection.filters || [],
    templateId: collection.templateId || "",
    ignoreFailed: collection.ignoreFailed !== false,
    enabled: collection.enabled !== false,
    meta: collection.meta || {},
  };
}

/**
 * A filter pattern reaches `new RegExp` at download time, so a typo would only
 * surface as a broken subscription URL long after saving.
 */
export function validateFilterRegexes(filters: FilterRule[] = []) {
  for (const [index, filter] of filters.entries()) {
    const patterns = [filter.pattern, ...(filter.patterns || []), ...(filter.expressions || [])];
    for (const pattern of patterns) {
      if (typeof pattern !== "string" || !pattern) continue;
      try {
        new RegExp(pattern.startsWith("(?i)") ? pattern.slice(4) : pattern);
      } catch {
        return `Filter ${index + 1} has an invalid regular expression: ${pattern}`;
      }
    }
  }
  return undefined;
}

export function validateSource(input: Partial<SourceRecord>) {
  const idError = validateRecordId(input.id, "Source");
  if (idError) return idError;
  const scriptError = validateScriptActions(input.filters || []);
  if (scriptError) return scriptError;
  const regexError = validateFilterRegexes(input.filters || []);
  if (regexError) return regexError;
  if (input.type === "local") {
    return stringValue(input.content) ? undefined : "Local source content is required";
  }
  const urls = stringValue(input.url).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (urls.length === 0) return "Remote source URL is required";
  if (urls.some((url) => !/^https?:\/\//i.test(url))) return "Remote source URLs must use http or https";
  return undefined;
}

export function validateSourcePayload(input: JsonMap, partial = false) {
  if ((!partial || "type" in input) && input.type !== "remote" && input.type !== "local") {
    return "Source type must be remote or local";
  }
  return undefined;
}

export async function validateCollection(env: SubStoreEnv, input: Partial<CollectionRecord>) {
  const idError = validateRecordId(input.id, "Collection");
  if (idError) return idError;
  const scriptError = validateScriptActions(input.filters || []);
  if (scriptError) return scriptError;
  const regexError = validateFilterRegexes(input.filters || []);
  if (regexError) return regexError;
  const sourceIds = input.sourceIds || [];
  const sourceIdSet = new Set((await listSources(env)).map((source) => source.id));
  const missingSources = sourceIds.filter((id) => !sourceIdSet.has(id));
  if (missingSources.length > 0) return `Collection references missing sources: ${missingSources.join(", ")}`;

  const templateId = stringValue(input.templateId);
  if (templateId && !(await getTemplate(env, templateId))) return `Collection references missing template: ${templateId}`;
  return undefined;
}

export function validateCollectionPayload(input: JsonMap, partial = false) {
  if ((!partial || "sourceIds" in input) && input.sourceIds !== undefined && !Array.isArray(input.sourceIds)) {
    return "Collection sourceIds must be an array";
  }
  return undefined;
}

export function validateRecordId(input: unknown, label: string) {
  const id = stringValue(input);
  if (!id) return `${label} id is required`;
  if (!/^[a-z0-9_-]{1,64}$/.test(id)) {
    return `${label} id must use 1-64 lowercase letters, numbers, underscores, or hyphens`;
  }
  return undefined;
}

export function normalizeDownloadTarget(input: unknown): SubscriptionTarget | undefined {
  if (input === undefined || input === null || String(input) === "") return undefined;
  return normalizeTargetAlias(input);
}

export function filterList(input: unknown, process?: unknown): FilterRule[] {
  const direct = Array.isArray(input) ? (input.filter((item) => item && typeof item === "object") as FilterRule[]) : [];
  if (direct.length > 0 || !Array.isArray(process)) return direct;
  return process.flatMap((item) => processToFilter(item)).filter(Boolean) as FilterRule[];
}

function processToFilter(input: unknown): FilterRule | FilterRule[] | undefined {
  const item = objectValue(input);
  if (!item.type || item.disabled === true) return undefined;
  const args = objectValue(item.args);
  if (["include", "exclude", "rename", "delete-field", "dedupe", "sort", "regex-sort", "flag", "quick", "resolve", "script"].includes(String(item.type))) {
    const { id: _id, customName: _customName, disabled: _disabled, ...filter } = item;
    return filter as FilterRule;
  }
  if (item.type === "Resolve Domain Operator") {
    return {
      type: "resolve",
      provider: normalizeResolveProvider(args.provider),
      recordType: args.type === "IPv6" ? "AAAA" : "A",
      filter: stringValue(args.filter) || "disabled",
      url: stringValue(args.url),
      edns: stringValue(args.edns),
      concurrency: args.concurrency === undefined ? "" : String(args.concurrency),
    };
  }
  return undefined;
}

function normalizeResolveProvider(input: unknown) {
  const provider = stringValue(input) || "Cloudflare";
  return ["Google", "Cloudflare", "Ali", "Tencent", "Custom"].includes(provider) ? provider : "Cloudflare";
}
