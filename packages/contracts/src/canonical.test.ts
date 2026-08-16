import { describe, expect, it } from "vitest";

import { canonicalJson, computeChecksum } from "./canonical.js";

describe("canonicalJson", () => {
  it("sorts object keys recursively and emits no whitespace", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 3, y: 4 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[2,{"y":4,"z":3}]},"b":1}',
    );
  });

  it("is insensitive to object key insertion order", () => {
    const one = canonicalJson({ x: 1, y: { b: 2, a: 3 } });
    const two = canonicalJson({ y: { a: 3, b: 2 }, x: 1 });
    expect(one).toBe(two);
  });

  it("rejects non-integer numbers", () => {
    expect(() => canonicalJson({ a: 1.5 })).toThrow(/non-integer/);
    expect(() => canonicalJson({ a: Number.NaN })).toThrow(/non-integer/);
    expect(() => canonicalJson({ a: Number.POSITIVE_INFINITY })).toThrow(/non-integer/);
  });

  it("rejects undefined values and unsupported types", () => {
    expect(() => canonicalJson({ a: undefined })).toThrow(/undefined value at \$\.a/);
    expect(() => canonicalJson({ a: () => 1 })).toThrow(/unsupported type/);
  });
});

describe("computeChecksum", () => {
  it("produces a stable sha-256 hex digest for equivalent values", async () => {
    const a = await computeChecksum({ x: 1, y: [true, "s"] });
    const b = await computeChecksum({ y: [true, "s"], x: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any value changes", async () => {
    const a = await computeChecksum({ x: 1 });
    const b = await computeChecksum({ x: 2 });
    expect(a).not.toBe(b);
  });
});
