/**
 * Small YAML emitter for subscription documents.
 *
 * The `yaml` package builds a full document tree before serializing it, which
 * dominates the subscription hot path for large proxy lists. Subscription
 * documents only contain plain objects, arrays, strings, numbers, booleans,
 * and null, so a direct block-style emitter can write them without that tree.
 *
 * Every string is emitted as a double-quoted scalar unless it is provably safe
 * as a plain scalar. Double-quoted JSON escapes are valid YAML escapes, which
 * keeps node names and rule text unambiguous.
 */

const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
// A block-context plain scalar: no leading/trailing whitespace, no trailing
// colon, no indicator at the start, no `: ` or ` #`, and no line breaks or
// non-printable controls.
const PLAIN_SCALAR = /^(?!\s)(?!.*\s$)(?!.*:$)(?![!&*?|>'"%@`#,[\]{}])(?![-?:](?:\s|$))(?!.*(?:\s#|:\s))[^\t\r\n\u0000-\u001f\u007f-\u009f\u2028\u2029]+$/u;
const RESERVED_SCALARS = new Set(["true", "false", "null", "yes", "no", "on", "off", "y", "n", "~"]);
const YAML_UNSAFE = /[\u007f-\u009f\u2028\u2029]/g;

export function stringifyYamlDocument(value: unknown) {
  const lines: string[] = [];
  writeValue(value, 0, lines);
  return `${lines.join("\n")}\n`;
}

function writeValue(value: unknown, indent: number, lines: string[]) {
  if (Array.isArray(value)) {
    writeArray(value, indent, lines);
    return;
  }
  if (isRecord(value)) {
    writeObject(value, indent, lines);
    return;
  }
  lines.push(`${" ".repeat(indent)}${formatScalar(value)}`);
}

function writeObject(value: Record<string, unknown>, indent: number, lines: string[]) {
  const pad = " ".repeat(indent);
  let written = 0;
  for (const key of Object.keys(value)) {
    const entry = value[key];
    if (entry === undefined) continue;
    writeEntry(entry, `${pad}${formatKey(key)}:`, indent + 2, lines);
    written += 1;
  }
  if (written === 0) lines.push(`${pad}{}`);
}

function writeArray(value: unknown[], indent: number, lines: string[]) {
  if (value.length === 0) {
    lines.push(`${" ".repeat(indent)}[]`);
    return;
  }
  const pad = " ".repeat(indent);
  for (const item of value) {
    if (isRecord(item)) {
      let written = 0;
      for (const key of Object.keys(item)) {
        const entry = item[key];
        if (entry === undefined) continue;
        // The first key shares the `- ` marker; siblings align under it.
        const prefix = written === 0 ? `${pad}- ${formatKey(key)}:` : `${pad}  ${formatKey(key)}:`;
        writeEntry(entry, prefix, indent + 4, lines);
        written += 1;
      }
      if (written === 0) lines.push(`${pad}- {}`);
      continue;
    }
    if (Array.isArray(item)) {
      if (item.length === 0) {
        lines.push(`${pad}- []`);
      } else {
        lines.push(`${pad}-`);
        writeArray(item, indent + 2, lines);
      }
      continue;
    }
    lines.push(`${pad}- ${formatScalar(item)}`);
  }
}

function writeEntry(entry: unknown, prefix: string, nestedIndent: number, lines: string[]) {
  if (Array.isArray(entry)) {
    if (entry.length === 0) {
      lines.push(`${prefix} []`);
    } else {
      lines.push(prefix);
      writeArray(entry, nestedIndent, lines);
    }
    return;
  }
  if (isRecord(entry)) {
    if (Object.keys(entry).length === 0) {
      lines.push(`${prefix} {}`);
    } else {
      lines.push(prefix);
      writeObject(entry, nestedIndent, lines);
    }
    return;
  }
  lines.push(`${prefix} ${formatScalar(entry)}`);
}

function formatKey(key: string) {
  return PLAIN_KEY.test(key) && !RESERVED_SCALARS.has(key.toLowerCase()) ? key : quoteString(key);
}

function formatScalar(value: unknown) {
  if (value === undefined || value === null) return "null";
  if (typeof value === "string") {
    if (
      PLAIN_SCALAR.test(value)
      && !RESERVED_SCALARS.has(value.toLowerCase())
      && !Number.isFinite(Number(value))
    ) {
      return value;
    }
    return quoteString(value);
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return ".nan";
    if (value === Infinity) return ".inf";
    if (value === -Infinity) return "-.inf";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return String(value);
  return quoteString(String(value));
}

function quoteString(value: string) {
  // JSON.stringify already escapes quotes, backslashes, and C0 controls.
  // YAML also treats DEL, C1 controls, and the Unicode line separators as
  // non-printable or line breaks, so escape those explicitly.
  return JSON.stringify(value).replace(
    YAML_UNSAFE,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
