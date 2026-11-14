export function stringSetting(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function numberSetting(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

export function commaList(value: string | null) {
  if (!value) return undefined;
  const list = value.split(",").map((item) => item.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

export function numberOrUndefined(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function stripUndefined<T extends Record<string, unknown>>(input: T) {
  const keys = Object.keys(input);
  let changed = false;
  for (const key of keys) {
    const value = input[key];
    if (value === undefined || value === "") {
      changed = true;
      break;
    }
  }
  if (!changed) return input;

  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value === undefined || value === "") continue;
    // JSON.parse can create an own `__proto__` key; assign it as data instead
    // of letting the assignment change the output prototype.
    if (key === "__proto__") {
      Object.defineProperty(output, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      output[key] = value;
    }
  }
  return output as T;
}

export function getByPath(input: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, input);
}

export function setByPath<T extends Record<string, unknown>>(input: T, path: string, value: unknown) {
  const parts = path.split(".");
  let current: Record<string, unknown> = input;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return input;
}

export function compileRegex(input: string, flags = "") {
  const normalizedFlags = [...new Set(flags.split(""))].join("");
  if (input.startsWith("(?i)")) return new RegExp(input.slice(4), [...new Set(`i${normalizedFlags}`.split(""))].join(""));
  return new RegExp(input, normalizedFlags);
}

export function base64Utf8(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const TEXT_DECODER = new TextDecoder();

export function decodeBase64UrlText(input: string) {
  const normalized = input.replace(/\s+/g, "");
  const padded = normalized.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    // `Uint8Array.from(binary, ...)` invokes a callback per byte; a direct loop
    // is roughly ten times faster on the per-node vmess payload.
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return TEXT_DECODER.decode(bytes);
  } catch {
    return "";
  }
}

export function encodeBase64UrlText(input: string) {
  return base64Utf8(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
