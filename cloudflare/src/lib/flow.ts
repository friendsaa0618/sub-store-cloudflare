import { MAX_FLOW_RESPONSE_BYTES } from "./limits";
import { readResponseText } from "./read";
import { numberValue, stringValue, type JsonMap } from "./values";

export type FlowRequest = {
  url: string;
  userAgent: string;
  headers: Record<string, string>;
  timeout: number;
};

export function parseFlowRequest(sub: JsonMap, settings: JsonMap = {}): FlowRequest | undefined {
  const rawUrl = stringValue(sub.url);
  const args = parseUrlArguments(rawUrl);
  const flowUrl = stringValue(args.flowUrl) || rawUrl.split("#")[0];
  if (args.noFlow || !/^https?:\/\//i.test(flowUrl)) return undefined;
  return {
    url: flowUrl,
    userAgent:
      stringValue(args.flowUserAgent) ||
      stringValue(settings.defaultFlowUserAgent) ||
      stringValue(settings.defaultUserAgent) ||
      "clash.meta/v1.19.24",
    headers: parseJsonHeaders(args.flowHeaders),
    timeout: numberValue(settings.defaultTimeout, 30000, 1000, 120000),
  };
}

export function parseFlowHeaders(flowHeaders: string) {
  const upload = numberField(flowHeaders, "upload") ?? 0;
  const download = numberField(flowHeaders, "download");
  const total = numberField(flowHeaders, "total");
  if (download === undefined || total === undefined) return undefined;
  return {
    expires: numberField(flowHeaders, "expire"),
    total,
    usage: { upload, download },
    remainingDays: numberField(flowHeaders, "reset_day"),
    appUrl: textField(flowHeaders, "app_url"),
    planName: textField(flowHeaders, "plan_name"),
  };
}

export async function fetchFlowHeaders(input: FlowRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), input.timeout);
  try {
    const response = await fetch(input.url, {
      headers: { "user-agent": input.userAgent, ...input.headers },
      signal: controller.signal,
    });
    const headerFlow = response.headers.get("subscription-userinfo");
    const appUrl = response.headers.get("profile-web-page-url");
    const planName = response.headers.get("profile-title") || response.headers.get("plan-name");
    const body = await readResponseText(response, MAX_FLOW_RESPONSE_BYTES, "Flow response");
    return [
      headerFlow,
      /(?:^|[;\n\r ])upload=/.test(body) ? body : undefined,
      appUrl ? `app_url=${encodeURIComponent(appUrl)}` : undefined,
      planName ? `plan_name=${encodeURIComponent(planName)}` : undefined,
    ]
      .filter(Boolean)
      .join("; ");
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseUrlArguments(rawUrl: string) {
  const hash = rawUrl.split("#").slice(1).join("#");
  if (!hash) return {} as JsonMap;
  try {
    return JSON.parse(decodeURIComponent(hash)) as JsonMap;
  } catch {
    return Object.fromEntries(
      hash
        .split("&")
        .filter(Boolean)
        .map((pair) => {
          const [key, value] = pair.split("=");
          return [key, value === undefined || value === "" ? true : decodeURIComponent(value)];
        }),
    );
  }
}

function parseJsonHeaders(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as JsonMap;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item)]));
  } catch {
    return {};
  }
}

function numberField(input: string, key: string) {
  const match = input.match(new RegExp(`${key}=([-+]?)([0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)`));
  return match ? Number(match[1] + match[2]) : undefined;
}

function textField(input: string, key: string) {
  const match = input.match(new RegExp(`${key}=(.*?)\\s*?(;|$)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
