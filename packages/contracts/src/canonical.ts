/**
 * Canonical JSON and state checksum — the single shared implementation
 * (Implementation Plan §7.8).
 *
 * Rules: object keys sorted lexicographically; no whitespace; `undefined`,
 * non-finite numbers, and non-integer numbers are rejected so that the same
 * state always produces byte-identical output on every platform.
 *
 * Uses WebCrypto (`globalThis.crypto.subtle`), available in Node >= 20 and
 * browsers, so this module stays free of platform imports.
 */

export function canonicalJson(value: unknown): string {
  return serialize(value, "$");
}

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new Error(`canonicalJson: non-integer or unsafe number at ${path}: ${value}`);
      }
      return String(value);
    case "object":
      break;
    default:
      throw new Error(`canonicalJson: unsupported type "${typeof value}" at ${path}`);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, i) => serialize(item, `${path}[${i}]`)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const item = record[key];
    if (item === undefined) {
      throw new Error(`canonicalJson: undefined value at ${path}.${key}`);
    }
    parts.push(`${JSON.stringify(key)}:${serialize(item, `${path}.${key}`)}`);
  }
  return `{${parts.join(",")}}`;
}

/** SHA-256 hex digest of the canonical JSON encoding of `value`. */
export async function computeChecksum(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
