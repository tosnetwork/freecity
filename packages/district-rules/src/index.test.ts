import { describe, expect, it } from "vitest";

import { CONTRACTS_SCHEMA_VERSION } from "@freecity/contracts";
import { PINNED_CONTRACTS_SCHEMA_VERSION, RULESET_VERSION } from "./index.js";

describe("workspace wiring", () => {
  it("district-rules resolves @freecity/contracts through the workspace", () => {
    expect(PINNED_CONTRACTS_SCHEMA_VERSION).toBe(CONTRACTS_SCHEMA_VERSION);
  });

  it("exposes a pinned ruleset version identifier", () => {
    expect(RULESET_VERSION).toBe("district-zero-r0");
  });
});
