export type JsonMap = Record<string, unknown>;

export function stringValue(input: unknown): string {
  return typeof input === "string" ? input : "";
}

export function stringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.map(String).filter(Boolean) : [];
}

export function objectValue(input: unknown): JsonMap {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as JsonMap) : {};
}

export function numberValue(input: unknown, fallback: number, min: number, max: number) {
  const number = Number(input);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}
