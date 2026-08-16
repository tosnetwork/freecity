/**
 * @freecity/district-rules — pure deterministic gameplay rules.
 * No I/O, no clocks, no randomness without a provided recorded seed.
 * The Focus/Card/Choice/Consequence state machines arrive in PR2.
 */

import { CONTRACTS_SCHEMA_VERSION } from "@freecity/contracts";

export const RULESET_VERSION = "district-zero-r0";

/** The contracts schema version this ruleset is pinned against. */
export const PINNED_CONTRACTS_SCHEMA_VERSION: number = CONTRACTS_SCHEMA_VERSION;
