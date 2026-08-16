import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runFixture, type ReplayFixture } from "./replay.js";

/**
 * Replay fixtures are the release gate for rule determinism. Expected values
 * are generated from the implementation:
 *
 *   UPDATE_FIXTURES=1 pnpm test
 *
 * then reviewed and committed. A checksum or event-stream divergence on an
 * unchanged ruleset is a release blocker, never something to "update away"
 * without understanding the cause.
 */

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const fixtureFiles = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

describe("replay fixtures", () => {
  it("finds at least the two R0 fixtures", () => {
    expect(fixtureFiles.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of fixtureFiles) {
    it(`reproduces ${file}`, async () => {
      const path = join(fixturesDir, file);
      const fixture = JSON.parse(readFileSync(path, "utf8")) as ReplayFixture;
      const run = await runFixture(fixture);

      if (process.env["UPDATE_FIXTURES"]) {
        const updated: ReplayFixture = {
          ...fixture,
          expected: { finalChecksum: run.finalChecksum, outcomes: run.outcomes },
        };
        writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`);
        return;
      }

      expect(
        fixture.expected,
        `fixture ${file} has no expected block; run UPDATE_FIXTURES=1 pnpm test and review the diff`,
      ).toBeDefined();
      expect(run.finalChecksum).toBe(fixture.expected?.finalChecksum);
      expect(run.outcomes).toEqual(fixture.expected?.outcomes);
    });

    it(`replays ${file} identically a second time`, async () => {
      const fixture = JSON.parse(readFileSync(join(fixturesDir, file), "utf8")) as ReplayFixture;
      const [first, second] = [await runFixture(fixture), await runFixture(fixture)];
      expect(first.finalChecksum).toBe(second.finalChecksum);
      expect(first.outcomes).toEqual(second.outcomes);
    });
  }
});
