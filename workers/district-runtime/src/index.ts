/**
 * @freecity/district-runtime — the runtime worker: district lease via row
 * lock, ordered command journal, deterministic steps, scheduled effects,
 * snapshots, transactional outbox, and replay verification. The deterministic
 * step never calls a model, the network, the wall clock, or unseeded
 * randomness; wall-clock reads happen only at the worker boundary and are
 * recorded as explicit step times.
 */

import { RULESET_VERSION } from "@freecity/district-rules";

export const ACTIVE_RULESET_VERSION: string = RULESET_VERSION;

export { createPool, withTransaction } from "./db.js";
export type { Pool, PoolClient } from "./db.js";
export { initDistrict } from "./init.js";
export type { InitDistrictOptions } from "./init.js";
export { enqueueCommand } from "./journal.js";
export type { EnqueueResult } from "./journal.js";
export { processDistrict, parseState } from "./step.js";
export type { ProcessOptions, ProcessSummary } from "./step.js";
export { createSnapshot, maybeAutoSnapshot, restoreSnapshot } from "./snapshots.js";
export type { SnapshotRecord } from "./snapshots.js";
export { replayDistrict } from "./replay.js";
export type { ReplayReport } from "./replay.js";
export { drainOutbox } from "./outbox.js";
export type { OutboxEvent } from "./outbox.js";
export { findDueDistricts, hasDueEffects, syncScheduledEffects } from "./schedule.js";
export { catchUpDistrict, runWorkerOnce } from "./worker.js";
export { createTestDatabase } from "./testdb.js";
export type { TestDatabase } from "./testdb.js";
