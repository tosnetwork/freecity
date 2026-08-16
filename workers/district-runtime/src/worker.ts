import { randomUUID } from "node:crypto";

import type { DistrictCommandEnvelope } from "@freecity/contracts";

import { withTransaction, type Pool } from "./db.js";
import { enqueueCommand } from "./journal.js";
import { findDueDistricts, hasDueEffects } from "./schedule.js";
import { processDistrict, type ProcessSummary } from "./step.js";

/**
 * Catch-up for one district at an explicit instant: if scheduled effects are
 * due, journal the idempotent system run_due_effects command, then process
 * whatever the journal holds. Used by the worker loop and by the API before
 * building a "While You Were Away" view. `now` is taken OUTSIDE the
 * deterministic step and recorded as its step time.
 */
export async function catchUpDistrict(
  pool: Pool,
  districtId: string,
  seasonId: string,
  now: string,
): Promise<ProcessSummary> {
  const effectsDue = await withTransaction(pool, (client) =>
    hasDueEffects(client, districtId, seasonId, now),
  );
  if (effectsDue) {
    const envelope: DistrictCommandEnvelope = {
      commandId: randomUUID(),
      // One catch-up command per district per step instant; duplicates
      // collapse in the journal.
      idempotencyKey: `run-due:${now}`,
      commandType: "runtime.run_due_effects",
      schemaVersion: 1,
      districtId,
      seasonId,
      actorRef: "system:scheduler",
      actorAuthority: "system",
      sourceRef: "district-runtime-worker",
      serverReceivedAt: now,
      correlationId: `run-due:${districtId}:${now}`,
      privacyScope: "district",
      payload: { limit: 100 },
    };
    await enqueueCommand(pool, envelope);
  }
  return processDistrict(pool, districtId, seasonId, { stepTime: now });
}

/**
 * One worker pass: wake every district with received commands or due
 * scheduled effects and run its catch-up.
 */
export async function runWorkerOnce(pool: Pool, now: string): Promise<Map<string, ProcessSummary>> {
  const due = await withTransaction(pool, (client) => findDueDistricts(client, now));
  const summaries = new Map<string, ProcessSummary>();
  for (const district of due) {
    const summary = await catchUpDistrict(pool, district.districtId, district.seasonId, now);
    summaries.set(`${district.districtId}/${district.seasonId}`, summary);
  }
  return summaries;
}
