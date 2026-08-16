/**
 * @freecity/district-rules — pure deterministic gameplay rules.
 * No I/O, no clocks, no randomness without a provided recorded seed.
 */

import { CONTRACTS_SCHEMA_VERSION } from "@freecity/contracts";

export const RULESET_VERSION = "district-zero-r2";

/** The contracts schema version this ruleset is pinned against. */
export const PINNED_CONTRACTS_SCHEMA_VERSION: number = CONTRACTS_SCHEMA_VERSION;

export { applyCommand, REJECTION_CODES } from "./apply.js";
export type { ApplyResult, RejectionCode } from "./apply.js";
export { WORLD_REJECTION_CODES } from "./city-world.js";
export { runFixture } from "./replay.js";
export type { FixtureStep, ReplayFixture, ReplayRun, StepOutcomeRecord } from "./replay.js";
export { addHours, addMinutes, dayKey, isDue } from "./time.js";
