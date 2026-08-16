/**
 * @freecity/district-runtime — the long-running runtime worker: district
 * lease, ordered command journal consumption, deterministic steps, scheduled
 * effects, snapshots, and the transactional outbox. Implementation arrives in
 * PR3. The deterministic step never calls a model, the network, the wall
 * clock, or unseeded randomness.
 */

import { RULESET_VERSION } from "@freecity/district-rules";

export const RUNTIME_WORKER_PACKAGE = "@freecity/district-runtime";
export const ACTIVE_RULESET_VERSION: string = RULESET_VERSION;
